-- 0013 목록 페이지에서 미등록 상품을 한 번에 등록하고 지금 가격까지 기록 (일괄 기록 북마클릿)
-- 목록에는 사이즈·모델번호가 없으므로 색상 페이지(상품 번호)마다 상품 1개 + 판매처 1개 + 옵션 "전체 옵션" 1개를 만든다.
-- 전체가 한 트랜잭션: 하나라도 실패하면 전부 취소. service_role 만 실행.
-- p_items: [{"brand": "...", "name": "...", "external_id": "7208075", "url": "https://www.musinsa.com/products/7208075",
--            "list_price": 99900, "sale_price": 84900, "stock_status": "unknown"}, ...]
create function public.register_and_record_batch(
  p_collected_at timestamptz,
  p_items        jsonb
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item    jsonb;
  v_reg     jsonb;
  v_listing bigint;
  v_lv      bigint;
  v_count   integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '등록할 상품이 없습니다';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception '한 번에 100개까지 등록할 수 있습니다';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_reg := public.register_product_listings(
      v_item ->> 'brand', v_item ->> 'name', '', '',
      jsonb_build_array(jsonb_build_object(
        'platform_code', 'musinsa',
        'external_id', v_item ->> 'external_id',
        'url', v_item ->> 'url',
        'variants', jsonb_build_array(jsonb_build_object('color', '', 'size', '', 'label', '전체 옵션'))
      ))
    );
    v_listing := (v_reg -> 'listing_ids' ->> 0)::bigint;
    select id into v_lv from public.listing_variants where listing_id = v_listing;

    perform public.record_manual_prices(
      v_listing, p_collected_at,
      jsonb_build_array(jsonb_build_object(
        'listing_variant_id', v_lv,
        'list_price', v_item -> 'list_price',
        'sale_price', v_item -> 'sale_price',
        'stock_status', coalesce(v_item ->> 'stock_status', 'unknown')
      ))
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.register_and_record_batch(timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.register_and_record_batch(timestamptz, jsonb) to service_role;

-- 일괄 기록 화면의 저장 1회: 등록된 판매처 가격 기록 + 미등록 상품 등록·가격 기록을 한 트랜잭션으로
create function public.capture_batch_save(
  p_collected_at timestamptz,
  p_listings     jsonb,
  p_new_items    jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_recorded   integer := 0;
  v_registered integer := 0;
begin
  if coalesce(jsonb_array_length(p_listings), 0) = 0 and coalesce(jsonb_array_length(p_new_items), 0) = 0 then
    raise exception '저장할 항목이 없습니다';
  end if;
  if coalesce(jsonb_array_length(p_listings), 0) > 0 then
    v_recorded := public.record_manual_prices_batch(p_collected_at, p_listings);
  end if;
  if coalesce(jsonb_array_length(p_new_items), 0) > 0 then
    v_registered := public.register_and_record_batch(p_collected_at, p_new_items);
  end if;
  return jsonb_build_object('recorded', v_recorded, 'registered', v_registered);
end;
$$;

revoke all on function public.capture_batch_save(timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.capture_batch_save(timestamptz, jsonb, jsonb) to service_role;
