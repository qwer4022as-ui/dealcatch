-- 0009 수동 등록·가격 입력 함수
-- 여러 테이블 쓰기를 한 트랜잭션으로 묶는다 (중간 실패 시 전부 취소).
-- service_role(서버)만 실행할 수 있다. 가격 무결성은 price_snapshots 트리거가 계속 검증한다.

-- 상품 등록 -----------------------------------------------------------------
-- 같은 브랜드·모델번호의 상품이 있으면 그 상품에 리스팅만 추가한다.
-- p_variants: [{"color": "블랙", "size": "M", "label": "블랙 / M"}, ...]
create function public.register_product(
  p_platform_code text,
  p_external_id   text,
  p_url           text,
  p_brand_name    text,
  p_product_name  text,
  p_model_no      text,
  p_category      text,
  p_variants      jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_platform   smallint;
  v_brand      bigint;
  v_product    bigint;
  v_reused     boolean := false;
  v_listing    bigint;
  v_item       jsonb;
  v_variant    bigint;
begin
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception '옵션을 1개 이상 입력해야 합니다';
  end if;

  select id into v_platform from public.platforms where code = p_platform_code;
  if v_platform is null then
    raise exception '알 수 없는 플랫폼: %', p_platform_code;
  end if;

  insert into public.brands (name) values (trim(p_brand_name))
    on conflict (name_normalized) do nothing;
  select id into v_brand from public.brands
   where name_normalized = lower(regexp_replace(trim(p_brand_name), '\s+', '', 'g'));

  if nullif(trim(p_model_no), '') is not null then
    select id into v_product from public.products
     where brand_id = v_brand and model_no = trim(p_model_no) and not is_sample;
  end if;

  if v_product is null then
    insert into public.products (brand_id, name, model_no, category, is_sample)
      values (v_brand, trim(p_product_name), nullif(trim(p_model_no), ''), nullif(trim(p_category), ''), false)
      returning id into v_product;
  else
    v_reused := true;
  end if;

  insert into public.listings (product_id, platform_id, external_id, url, title_on_platform)
    values (v_product, v_platform, p_external_id, p_url, trim(p_product_name))
    returning id into v_listing;

  for v_item in select * from jsonb_array_elements(p_variants) loop
    insert into public.product_variants (product_id, color, size)
      values (v_product, coalesce(trim(v_item ->> 'color'), ''), coalesce(trim(v_item ->> 'size'), ''))
      on conflict (product_id, color, size) do nothing;
    select id into v_variant from public.product_variants
     where product_id = v_product
       and color = coalesce(trim(v_item ->> 'color'), '')
       and size  = coalesce(trim(v_item ->> 'size'), '');
    insert into public.listing_variants (listing_id, product_variant_id, option_label_raw)
      values (v_listing, v_variant, v_item ->> 'label');
  end loop;

  return jsonb_build_object('product_id', v_product, 'listing_id', v_listing, 'reused_product', v_reused);
end;
$$;

-- 수동 가격 입력 --------------------------------------------------------------
-- 수집 시도 1건(성공) + 옵션별 가격 기록을 한 번에 저장한다.
-- p_items: [{"listing_variant_id": 1, "list_price": 189000, "sale_price": 129000, "stock_status": "in_stock"}, ...]
create function public.record_manual_prices(
  p_listing_id   bigint,
  p_collected_at timestamptz,
  p_items        jsonb
) returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_attempt bigint;
  v_item    jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '가격을 1개 이상 입력해야 합니다';
  end if;

  insert into public.collection_attempts (run_id, listing_id, attempted_at, outcome)
    values (null, p_listing_id, p_collected_at, 'success')
    returning id into v_attempt;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.price_snapshots
      (listing_variant_id, attempt_id, collected_at, list_price, sale_price, stock_status, source)
    values (
      (v_item ->> 'listing_variant_id')::bigint,
      v_attempt,
      p_collected_at,
      (v_item ->> 'list_price')::integer,
      (v_item ->> 'sale_price')::integer,
      coalesce(v_item ->> 'stock_status', 'unknown')::public.stock_status,
      'manual'
    );
  end loop;

  return v_attempt;
end;
$$;

-- 권한: 서버만 실행 -------------------------------------------------------------
revoke all on function public.register_product(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_manual_prices(bigint, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.register_product(text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.record_manual_prices(bigint, timestamptz, jsonb) to service_role;
