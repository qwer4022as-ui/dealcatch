-- 0004 views
-- docs/database.md §5. 통계(최저가·커버리지)는 lib/pricing 에서 계산한다.
-- security_invoker: 조회하는 사용자의 RLS 를 그대로 적용한다.

-- 5.1 옵션별 최신 유효 가격
create view public.v_latest_price
with (security_invoker = true) as
select distinct on (ps.listing_variant_id)
       ps.listing_variant_id,
       ps.sale_price,
       ps.list_price,
       ps.stock_status,
       ps.collected_at,
       ps.source
  from public.price_snapshots ps
 where not ps.is_void
 order by ps.listing_variant_id, ps.collected_at desc;

-- 5.2 리스팅별 수집 상태
create view public.v_listing_health
with (security_invoker = true) as
select l.id as listing_id,
       l.status,
       l.consecutive_failures,
       last_attempt.attempted_at as last_attempt_at,
       last_attempt.outcome      as last_outcome,
       last_success.attempted_at as last_success_at
  from public.listings l
  left join lateral (
    select a.attempted_at, a.outcome
      from public.collection_attempts a
     where a.listing_id = l.id
     order by a.attempted_at desc
     limit 1
  ) last_attempt on true
  left join lateral (
    select a.attempted_at
      from public.collection_attempts a
     where a.listing_id = l.id and a.outcome = 'success'
     order by a.attempted_at desc
     limit 1
  ) last_success on true;
