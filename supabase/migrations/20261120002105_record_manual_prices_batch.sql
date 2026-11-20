-- 0012 여러 판매처의 수동 가격을 한 번에 기록 (일괄 기록 북마클릿)
-- 판매처마다 record_manual_prices 와 같은 규칙으로 기록하며, 전체가 한 트랜잭션이다 (하나라도 실패하면 전부 취소).
-- p_listings: [{"listing_id": 1, "items": [{"listing_variant_id": 10, "list_price": 99900, "sale_price": 84900, "stock_status": "unknown"}, ...]}, ...]
create function public.record_manual_prices_batch(
  p_collected_at timestamptz,
  p_listings     jsonb
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_l     jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_listings) <> 'array' or jsonb_array_length(p_listings) = 0 then
    raise exception '기록할 판매처가 없습니다';
  end if;
  if jsonb_array_length(p_listings) > 200 then
    raise exception '한 번에 200개 판매처까지 기록할 수 있습니다';
  end if;

  for v_l in select * from jsonb_array_elements(p_listings) loop
    perform public.record_manual_prices((v_l ->> 'listing_id')::bigint, p_collected_at, v_l -> 'items');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.record_manual_prices_batch(timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.record_manual_prices_batch(timestamptz, jsonb) to service_role;
