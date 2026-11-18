-- 0010 상품 1개 + 판매처(리스팅) 여러 개를 한 번에 등록
-- 무신사는 색상마다 상품 번호(페이지)가 다르므로, 같은 상품의 색상별 페이지를 각각 리스팅으로 등록한다.
-- 한 트랜잭션: 하나라도 실패하면 전부 취소. service_role 만 실행.
-- 이 함수가 register_product(0009)를 대체한다.

-- p_listings: [{"platform_code": "musinsa", "external_id": "7160057", "url": "...",
--               "variants": [{"color": "Charcoal", "size": "M", "label": "Charcoal / M"}, ...]}, ...]
create function public.register_product_listings(
  p_brand_name   text,
  p_product_name text,
  p_model_no     text,
  p_category     text,
  p_listings     jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_brand    bigint;
  v_product  bigint;
  v_reused   boolean := false;
  v_platform smallint;
  v_listing  bigint;
  v_ids      bigint[] := '{}';
  v_l        jsonb;
  v_item     jsonb;
  v_variant  bigint;
begin
  if jsonb_typeof(p_listings) <> 'array' or jsonb_array_length(p_listings) = 0 then
    raise exception '판매처를 1개 이상 입력해야 합니다';
  end if;
  if jsonb_array_length(p_listings) > 20 then
    raise exception '판매처는 한 번에 20개까지 등록할 수 있습니다';
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

  for v_l in select * from jsonb_array_elements(p_listings) loop
    if jsonb_typeof(v_l -> 'variants') <> 'array' or jsonb_array_length(v_l -> 'variants') = 0 then
      raise exception '판매처마다 옵션을 1개 이상 입력해야 합니다 (%)', v_l ->> 'external_id';
    end if;

    select id into v_platform from public.platforms where code = v_l ->> 'platform_code';
    if v_platform is null then
      raise exception '알 수 없는 플랫폼: %', v_l ->> 'platform_code';
    end if;

    insert into public.listings (product_id, platform_id, external_id, url, title_on_platform)
      values (v_product, v_platform, v_l ->> 'external_id', v_l ->> 'url', trim(p_product_name))
      returning id into v_listing;
    v_ids := v_ids || v_listing;

    for v_item in select * from jsonb_array_elements(v_l -> 'variants') loop
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
  end loop;

  return jsonb_build_object('product_id', v_product, 'listing_ids', to_jsonb(v_ids), 'reused_product', v_reused);
end;
$$;

revoke all on function public.register_product_listings(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.register_product_listings(text, text, text, text, jsonb) to service_role;

-- 대체된 함수 제거 (앱은 register_product_listings 만 사용)
drop function public.register_product(text, text, text, text, text, text, text, jsonb);
