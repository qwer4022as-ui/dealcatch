-- 데모용 샘플 데이터: 90일 가격 추적 상품 10개 (개발·데모 전용)
-- docs/PRD.md §7 샘플 데이터 정책을 따른다.
--
-- 규칙
--  * 가상 브랜드·가상 상품만 사용한다 (실제 상품의 가격 이력처럼 보이지 않게).
--  * 모든 상품 is_sample = true, 모든 가격 source = 'sample' → 화면에 "샘플" 배지가 붙는다.
--  * 날짜는 실행 시점 기준 "N일 전"으로 계산한다. 하루 1회 21:00(KST) 기록, 오늘 21:00 이 아직 안 됐으면 실행 직전 시각.
--  * 이미 들어가 있으면(모델번호 SMP-D-01 존재) 아무것도 하지 않는다. 다시 넣으려면 먼저 지운다.
--  * 삭제: select public.purge_sample_data();   (supabase/seed/sample.sql 의 샘플도 함께 지워진다)
--
-- 가격 패턴 (p_steps: [[며칠 전부터, 판매가], ...] — 다음 항목 전까지 그 가격 유지)
--  D-01 패디드 봄버      단계적 인하, 최근 수집 기간 최저가 갱신
--  D-02 스웨트 후드 집업  50~45일 전 반짝 세일, 최근 다시 최저가
--  D-03 와이드 데님      40일 전 최저, 지금은 최저가 +7%
--  D-04 옥스포드 셔츠    70~60일 전 최저, 이후 반등
--  D-05 경량 패딩 베스트  계속 인상
--  D-06 나일론 윈드브레이커  오르내림 반복
--  D-07 크루넥 스웨트    20~15일 전 품절(최저가 계산 제외), 3일 전 인하
--  D-08 카고 팬츠        주 단위 할인 반복 (지그재그)
--  D-09 니트 가디건      인하 후 소폭 반등
--  D-10 다운 파카        큰 폭 단계 인하, 6일 전 최저가 갱신

create or replace function pg_temp.demo_add_listing(
  p_brand text, p_name text, p_model text, p_category text,
  p_color text, p_sizes text[], p_external_id text
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

  insert into public.products (brand_id, name, model_no, category, is_sample)
    values (v_brand, p_name, p_model, p_category, true)
    returning id into v_product;

  insert into public.listings (product_id, platform_id, external_id, url, title_on_platform)
    select v_product, pl.id, p_external_id,
           'https://example.com/sample-a/goods/' || p_external_id,
           '[샘플] ' || p_name
      from public.platforms pl where pl.code = 'sample-a'
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

-- 하루 1회 기록. p_steps 는 며칠 전 내림차순 [[90, 169000], [60, 159000], ...]
create or replace function pg_temp.demo_history(
  p_listing bigint, p_run bigint, p_list int, p_steps jsonb,
  p_extra jsonb default '{}', p_soldout int[] default null, p_days int default 90
) returns void
language plpgsql as $$
declare
  v_today   date := (now() at time zone 'Asia/Seoul')::date;
  v_d       int;
  v_ts      timestamptz;
  v_attempt bigint;
  v_price   int;
  v_lv      record;
  v_add     int;
begin
  for v_d in reverse p_days .. 0 loop
    v_ts := ((v_today - v_d) + time '21:00') at time zone 'Asia/Seoul';
    if v_ts > now() then
      v_ts := now() - interval '5 minutes';
    end if;

    -- 며칠 전(v_d)보다 같거나 이른 단계 중 가장 최근 것
    select (s ->> 1)::int into v_price
      from jsonb_array_elements(p_steps) s
     where (s ->> 0)::int >= v_d
     order by (s ->> 0)::int asc
     limit 1;

    insert into public.collection_attempts (run_id, listing_id, attempted_at, outcome, http_status, duration_ms)
      values (p_run, p_listing, v_ts, 'success', 200, 600)
      returning id into v_attempt;

    for v_lv in select id, option_label_raw from public.listing_variants where listing_id = p_listing loop
      v_add := coalesce((p_extra ->> v_lv.option_label_raw)::int, 0);
      insert into public.price_snapshots
        (listing_variant_id, attempt_id, collected_at, list_price, sale_price, stock_status, source)
      values (
        v_lv.id, v_attempt, v_ts, p_list + v_add, least(v_price + v_add, p_list + v_add),
        case when p_soldout is not null and v_d between p_soldout[2] and p_soldout[1]
             then 'sold_out'::public.stock_status else 'in_stock'::public.stock_status end,
        'sample'
      );
    end loop;
  end loop;
end;
$$;

do $$
declare
  v_run bigint;
  v_l   bigint;
begin
  if exists (select 1 from public.products where model_no = 'SMP-D-01') then
    raise notice '데모 샘플이 이미 있습니다. 다시 넣으려면 먼저 select public.purge_sample_data(); 를 실행하세요.';
    return;
  end if;

  insert into public.platforms (code, name, base_url, collection_mode, policy_note) values
    ('sample-a', '샘플 플랫폼 A', 'https://example.com/sample-a', 'sample', '개발·데모용 가상 플랫폼')
    on conflict (code) do nothing;

  insert into public.collection_runs (platform_id, trigger, started_at, status)
    select id, 'seed', now() - interval '91 days', 'running' from public.platforms where code = 'sample-a'
    returning id into v_run;

  -- D-01 패디드 봄버: 단계적 인하, 최근 최저가 갱신
  v_l := pg_temp.demo_add_listing('SAMPLE 스튜디오', '패디드 봄버 자켓', 'SMP-D-01', '아우터',
                                  '블랙', array['M', 'L', 'XL'], 'SMP-D-1001');
  perform pg_temp.demo_history(v_l, v_run, 189000,
    '[[90, 169000], [62, 159000], [35, 149000], [28, 159000], [4, 139000]]',
    p_extra => '{"블랙 / XL": 5000}');

  -- D-02 스웨트 후드 집업: 반짝 세일 후 최근 다시 최저가
  v_l := pg_temp.demo_add_listing('SAMPLE 스튜디오', '헤비 스웨트 후드 집업', 'SMP-D-02', '상의',
                                  '그레이', array['M', 'L'], 'SMP-D-1002');
  perform pg_temp.demo_history(v_l, v_run, 99000,
    '[[90, 89000], [50, 79000], [44, 89000], [12, 84000], [2, 75000]]');

  -- D-03 와이드 데님: 40일 전 최저, 지금은 최저가 +7%
  v_l := pg_temp.demo_add_listing('SAMPLE 데님웍스', '와이드 스트레이트 데님', 'SMP-D-03', '하의',
                                  '인디고', array['28', '30', '32'], 'SMP-D-1003');
  perform pg_temp.demo_history(v_l, v_run, 89000,
    '[[90, 79000], [40, 69000], [33, 74000]]');

  -- D-04 옥스포드 셔츠: 70~60일 전 최저, 이후 반등
  v_l := pg_temp.demo_add_listing('SAMPLE 스튜디오', '옥스포드 버튼다운 셔츠', 'SMP-D-04', '상의',
                                  '화이트', array['M', 'L'], 'SMP-D-1004');
  perform pg_temp.demo_history(v_l, v_run, 59000,
    '[[90, 49000], [70, 39000], [59, 45000], [20, 47000]]');

  -- D-05 경량 패딩 베스트: 계속 인상
  v_l := pg_temp.demo_add_listing('SAMPLE 아웃도어', '경량 패딩 베스트', 'SMP-D-05', '아우터',
                                  '네이비', array['M', 'L'], 'SMP-D-1005');
  perform pg_temp.demo_history(v_l, v_run, 129000,
    '[[90, 99000], [45, 109000], [15, 119000], [5, 124000]]');

  -- D-06 나일론 윈드브레이커: 오르내림 반복
  v_l := pg_temp.demo_add_listing('SAMPLE 아웃도어', '나일론 윈드브레이커', 'SMP-D-06', '아우터',
                                  '그린', array['M', 'L', 'XL'], 'SMP-D-1006');
  perform pg_temp.demo_history(v_l, v_run, 149000,
    '[[90, 139000], [80, 119000], [55, 129000], [25, 109000], [8, 115000]]');

  -- D-07 크루넥 스웨트: 20~15일 전 품절(최저가 계산 제외), 3일 전 인하
  v_l := pg_temp.demo_add_listing('SAMPLE 스튜디오', '크루넥 스웨트셔츠', 'SMP-D-07', '상의',
                                  '레드', array['M', 'L'], 'SMP-D-1007');
  perform pg_temp.demo_history(v_l, v_run, 69000,
    '[[90, 59000], [20, 45000], [14, 59000], [3, 52000]]',
    p_soldout => array[20, 15]);

  -- D-08 카고 팬츠: 주 단위 할인 반복
  v_l := pg_temp.demo_add_listing('SAMPLE 데님웍스', '나일론 카고 팬츠', 'SMP-D-08', '하의',
                                  '카키', array['M', 'L'], 'SMP-D-1008');
  perform pg_temp.demo_history(v_l, v_run, 99000,
    '[[90, 89000], [84, 84000], [80, 89000], [70, 84000], [66, 89000], [56, 84000], [52, 89000],
      [42, 84000], [38, 89000], [28, 84000], [24, 89000], [14, 84000], [10, 89000], [0, 84000]]');

  -- D-09 니트 가디건: 인하 후 소폭 반등
  v_l := pg_temp.demo_add_listing('SAMPLE 스튜디오', '램스울 니트 가디건', 'SMP-D-09', '상의',
                                  '베이지', array['M', 'L'], 'SMP-D-1009');
  perform pg_temp.demo_history(v_l, v_run, 119000,
    '[[90, 109000], [60, 99000], [30, 89000], [10, 94000]]');

  -- D-10 다운 파카: 큰 폭 단계 인하, 6일 전 최저가 갱신
  v_l := pg_temp.demo_add_listing('SAMPLE 아웃도어', '구스 다운 파카', 'SMP-D-10', '아우터',
                                  '블랙', array['M', 'L', 'XL'], 'SMP-D-1010');
  perform pg_temp.demo_history(v_l, v_run, 329000,
    '[[90, 299000], [75, 279000], [50, 259000], [20, 249000], [6, 229000]]',
    p_extra => '{"블랙 / XL": 10000}');

  update public.collection_runs r
     set total       = s.total,
         succeeded   = s.total,
         failed      = 0,
         finished_at = s.last_at,
         status      = 'succeeded'
    from (select count(*)::int as total, max(attempted_at) as last_at
            from public.collection_attempts where run_id = v_run) s
   where r.id = v_run;
end;
$$;
