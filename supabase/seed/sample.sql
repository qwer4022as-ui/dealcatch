-- 샘플 데이터 (개발·데모 전용)
-- docs/PRD.md §7, docs/database.md §7
--
-- 규칙
--  * 가상 브랜드·가상 상품만 사용한다 (실제 상품의 가격 이력처럼 보이지 않게).
--  * 모든 상품 is_sample = true, 모든 가격 source = 'sample'.
--  * 날짜는 실행 시점 기준 "N일 전" 으로 계산한다. 수집 시각은 매일 09:00, 21:00 (KST).
--  * 삭제: select public.purge_sample_data();
--
-- 시나리오 (상품 → 검증 대상)
--  1 울 코트        130일 꾸준히 수집, 할인 2회, L 사이즈 +5,000원, 플랫폼 B에도 등록  → 30/90일 최저가, 변형별 가격, 플랫폼 비교
--  2 램스울 니트     20일 수집                                              → 30/90일 데이터 부족
--  3 와이드 데님     50일 수집, 20~34일 전 15일 공백                           → 커버리지 미달, 그래프 공백
--  4 옥스포드 셔츠   60일 수집, 최근 3회 연속 실패                              → 수집 실패 배지
--  5 캔버스 스니커즈  40일 수집, 3일 전부터 수집 없음                           → 오래된 데이터
--  6 집업 후드       100일 수집, 10~15일 전 품절(최저가), 무효 처리 기록 1건      → 품절 제외, void 제외

-- 상품 + 정규 변형 + 리스팅 + 리스팅 옵션 생성. 리스팅 id 반환.
create function pg_temp.add_listing(
  p_brand text, p_name text, p_model text, p_category text,
  p_color text, p_sizes text[], p_platform text, p_external_id text
) returns bigint
language plpgsql as $$
declare
  v_brand   bigint;
  v_product bigint;
  v_listing bigint;
  v_size    text;
  v_variant bigint;
begin
  insert into public.brands (name) values (p_brand)
    on conflict (name_normalized) do nothing;
  select id into v_brand from public.brands
   where name_normalized = lower(regexp_replace(p_brand, '\s+', '', 'g'));

  select id into v_product from public.products where brand_id = v_brand and model_no = p_model;
  if v_product is null then
    insert into public.products (brand_id, name, model_no, category, is_sample)
      values (v_brand, p_name, p_model, p_category, true)
      returning id into v_product;
  end if;

  insert into public.listings (product_id, platform_id, external_id, url, title_on_platform)
    select v_product, pl.id, p_external_id,
           'https://example.com/' || p_platform || '/goods/' || p_external_id,
           '[샘플] ' || p_name
      from public.platforms pl where pl.code = p_platform
    returning id into v_listing;

  foreach v_size in array p_sizes loop
    insert into public.product_variants (product_id, color, size)
      values (v_product, p_color, v_size)
      on conflict (product_id, color, size) do nothing;
    select id into v_variant from public.product_variants
     where product_id = v_product and color = p_color and size = v_size;
    insert into public.listing_variants (listing_id, product_variant_id, option_label_raw)
      values (v_listing, v_variant, p_color || ' / ' || v_size);
  end loop;

  return v_listing;
end;
$$;

-- 수집 이력 생성.
--  p_days       : 첫 수집이 며칠 전인지
--  p_stop_days  : 마지막 수집이 며칠 전인지 (0 = 오늘까지)
--  p_gap_from/to: 수집 시도 자체가 없는 기간 (며칠 전 ~ 며칠 전)
--  p_fail_last  : 마지막 N회 시도는 실패 (가격 없음)
--  p_discounts  : [{"from": 25, "to": 18, "price": 119000}]  (며칠 전 ~ 며칠 전, 포함)
--  p_extra      : {"블랙 / L": 5000}  옵션별 추가금
--  p_soldout    : [from, to] 품절 기간
create function pg_temp.seed_history(
  p_listing bigint, p_run bigint, p_days int, p_list int, p_base int,
  p_discounts jsonb default '[]', p_extra jsonb default '{}',
  p_stop_days int default 0, p_gap_from int default null, p_gap_to int default null,
  p_fail_last int default 0, p_soldout int[] default null
) returns void
language plpgsql as $$
declare
  v_today   date := (now() at time zone 'Asia/Seoul')::date;
  v_slots   timestamptz[] := '{}';
  v_ts      timestamptz;
  v_d       int;
  v_h       int;
  v_i       int;
  v_n       int;
  v_attempt bigint;
  v_price   int;
  v_lv      record;
begin
  for v_d in reverse p_days .. p_stop_days loop
    continue when p_gap_from is not null and v_d between p_gap_to and p_gap_from;
    foreach v_h in array array[9, 21] loop
      v_ts := ((v_today - v_d) + make_time(v_h, 0, 0)) at time zone 'Asia/Seoul';
      continue when v_ts > now();
      v_slots := v_slots || v_ts;
    end loop;
  end loop;

  v_n := coalesce(array_length(v_slots, 1), 0);
  for v_i in 1 .. v_n loop
    v_ts := v_slots[v_i];
    v_d  := v_today - (v_ts at time zone 'Asia/Seoul')::date;

    if v_i > v_n - p_fail_last then
      insert into public.collection_attempts (run_id, listing_id, attempted_at, outcome, http_status, error_detail, duration_ms)
        values (p_run, p_listing, v_ts, 'parse_error', 200, '[샘플] 가격 요소를 찾을 수 없음', 850);
      continue;
    end if;

    insert into public.collection_attempts (run_id, listing_id, attempted_at, outcome, http_status, duration_ms)
      values (p_run, p_listing, v_ts, 'success', 200, 600)
      returning id into v_attempt;

    select coalesce(min((x ->> 'price')::int), p_base) into v_price
      from jsonb_array_elements(p_discounts) x
     where v_d between (x ->> 'to')::int and (x ->> 'from')::int;

    for v_lv in select id, option_label_raw from public.listing_variants where listing_id = p_listing loop
      insert into public.price_snapshots
        (listing_variant_id, attempt_id, collected_at, list_price, sale_price, stock_status, source)
      values (
        v_lv.id, v_attempt, v_ts,
        p_list + coalesce((p_extra ->> v_lv.option_label_raw)::int, 0),
        v_price + coalesce((p_extra ->> v_lv.option_label_raw)::int, 0),
        case when p_soldout is not null and v_d between p_soldout[2] and p_soldout[1]
             then 'sold_out'::public.stock_status else 'in_stock'::public.stock_status end,
        'sample'
      );
    end loop;
  end loop;

  update public.listings set consecutive_failures = p_fail_last where id = p_listing;
end;
$$;

do $$
declare
  v_run_a bigint;
  v_run_b bigint;
  v_l     bigint;
  v_lv    bigint;
  v_att   bigint;
  v_ts    timestamptz;
begin
  insert into public.platforms (code, name, base_url, collection_mode, policy_note) values
    ('sample-a', '샘플 플랫폼 A', 'https://example.com/sample-a', 'sample', '개발·데모용 가상 플랫폼'),
    ('sample-b', '샘플 플랫폼 B', 'https://example.com/sample-b', 'sample', '개발·데모용 가상 플랫폼');

  insert into public.collection_runs (platform_id, trigger, started_at, status)
    select id, 'seed', now() - interval '131 days', 'running' from public.platforms where code = 'sample-a'
    returning id into v_run_a;
  insert into public.collection_runs (platform_id, trigger, started_at, status)
    select id, 'seed', now() - interval '61 days', 'running' from public.platforms where code = 'sample-b'
    returning id into v_run_b;

  -- 1 울 코트 (플랫폼 A, B)
  v_l := pg_temp.add_listing('SAMPLE 브랜드 A', '울 블렌드 싱글 코트', 'SMP-COAT-01', '아우터',
                             '블랙', array['S', 'M', 'L'], 'sample-a', 'SMP-A-1001');
  perform pg_temp.seed_history(v_l, v_run_a, 130, 189000, 159000,
    p_discounts => '[{"from": 100, "to": 90, "price": 129000},
                     {"from": 25,  "to": 18, "price": 119000},
                     {"from": 3,   "to": 0,  "price": 129000}]',
    p_extra => '{"블랙 / L": 5000}');

  v_l := pg_temp.add_listing('SAMPLE 브랜드 A', '울 블렌드 싱글 코트', 'SMP-COAT-01', '아우터',
                             '블랙', array['M'], 'sample-b', 'SMP-B-2001');
  perform pg_temp.seed_history(v_l, v_run_b, 60, 189000, 165000,
    p_discounts => '[{"from": 10, "to": 0, "price": 135000}]');

  -- 2 램스울 니트: 20일
  v_l := pg_temp.add_listing('SAMPLE 브랜드 B', '램스울 크루넥 니트', 'SMP-KNIT-02', '상의',
                             '그레이', array['M', 'L'], 'sample-a', 'SMP-A-1002');
  perform pg_temp.seed_history(v_l, v_run_a, 20, 79000, 59000,
    p_discounts => '[{"from": 5, "to": 0, "price": 57000}]');

  -- 3 와이드 데님: 50일, 20~34일 전 공백
  v_l := pg_temp.add_listing('SAMPLE 브랜드 C', '와이드 데님 팬츠', 'SMP-DNM-03', '하의',
                             '인디고', array['28', '30', '32'], 'sample-a', 'SMP-A-1003');
  perform pg_temp.seed_history(v_l, v_run_a, 50, 99000, 79000,
    p_discounts => '[{"from": 45, "to": 40, "price": 69000}]',
    p_gap_from => 34, p_gap_to => 20);

  -- 4 옥스포드 셔츠: 최근 3회 연속 실패
  v_l := pg_temp.add_listing('SAMPLE 브랜드 A', '옥스포드 버튼다운 셔츠', 'SMP-SHT-04', '상의',
                             '화이트', array['M', 'L'], 'sample-a', 'SMP-A-1004');
  perform pg_temp.seed_history(v_l, v_run_a, 60, 69000, 49000, p_fail_last => 3);

  -- 5 캔버스 스니커즈: 3일 전부터 수집 없음
  v_l := pg_temp.add_listing('SAMPLE 브랜드 B', '캔버스 로우 스니커즈', 'SMP-SNK-05', '신발',
                             '아이보리', array['260', '270', '280'], 'sample-a', 'SMP-A-1005');
  perform pg_temp.seed_history(v_l, v_run_a, 40, 89000, 69000, p_stop_days => 3);

  -- 6 집업 후드: 10~15일 전 품절(이때 가격이 가장 낮음), 무효 기록 1건
  v_l := pg_temp.add_listing('SAMPLE 브랜드 C', '헤비 스웨트 집업 후드', 'SMP-HD-06', '상의',
                             '차콜', array['M', 'L'], 'sample-a', 'SMP-A-1006');
  perform pg_temp.seed_history(v_l, v_run_a, 100, 89000, 65000,
    p_discounts => '[{"from": 15, "to": 10, "price": 45000}]',
    p_soldout => array[15, 10]);

  -- 잘못 입력된 이상치 → 무효 처리 (통계에서 제외되어야 함)
  v_ts := (((now() at time zone 'Asia/Seoul')::date - 7) + time '15:00') at time zone 'Asia/Seoul';
  select id into v_lv from public.listing_variants where listing_id = v_l and option_label_raw = '차콜 / M';
  insert into public.collection_attempts (run_id, listing_id, attempted_at, outcome, http_status, duration_ms)
    values (v_run_a, v_l, v_ts, 'success', 200, 600) returning id into v_att;
  insert into public.price_snapshots (listing_variant_id, attempt_id, collected_at, list_price, sale_price, stock_status, source)
    values (v_lv, v_att, v_ts, 89000, 9900, 'in_stock', 'sample');
  update public.price_snapshots
     set is_void = true, void_reason = '[샘플] 가격 단위 파싱 오류 (99,000 → 9,900)'
   where attempt_id = v_att;

  -- 실행 집계
  update public.collection_runs r
     set total       = s.total,
         succeeded   = s.ok,
         failed      = s.total - s.ok,
         finished_at = s.last_at,
         status      = case when s.ok = s.total then 'succeeded'::public.run_status
                            else 'partial'::public.run_status end
    from (select run_id, count(*)::int as total,
                 count(*) filter (where outcome = 'success')::int as ok,
                 max(attempted_at) as last_at
            from public.collection_attempts group by run_id) s
   where s.run_id = r.id and r.id in (v_run_a, v_run_b);
end;
$$;
