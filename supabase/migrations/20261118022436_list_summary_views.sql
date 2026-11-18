-- 0007 목록·대시보드용 요약 뷰
-- 목록 화면이 전체 가격 기록을 읽지 않도록 옵션·리스팅 단위 요약을 DB 에서 계산한다.
-- 규칙은 lib/pricing 기본 설정과 같다: 무효 기록 제외, 최저가는 품절 기록 제외.
-- 30/90일 최저가(커버리지 판정)는 상세 화면에서만 lib/pricing 으로 계산한다.

-- 리스팅 수집 상태: 마지막 성공 이후 실패 횟수 열 추가 (기존 열 뒤에 추가)
create or replace view public.v_listing_health
with (security_invoker = true) as
select l.id as listing_id,
       l.status,
       l.consecutive_failures,
       last_attempt.attempted_at as last_attempt_at,
       last_attempt.outcome      as last_outcome,
       last_success.attempted_at as last_success_at,
       (select count(*)::int
          from public.collection_attempts a
         where a.listing_id = l.id
           and a.outcome <> 'success'
           and (last_success.attempted_at is null or a.attempted_at > last_success.attempted_at)
       ) as failures_since_success
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

-- 옵션별 가격 요약
create view public.v_variant_price_summary
with (security_invoker = true) as
with agg as (
  select ps.listing_variant_id,
         count(*)::int                                          as record_count,
         min(ps.collected_at)                                   as first_collected_at,
         max(ps.collected_at)                                   as last_collected_at,
         min(ps.sale_price) filter (where ps.stock_status <> 'sold_out') as low_price,
         bool_or(ps.source = 'sample')                          as has_sample
    from public.price_snapshots ps
   where not ps.is_void
   group by ps.listing_variant_id
)
select agg.*,
       (select max(ps.collected_at)
          from public.price_snapshots ps
         where ps.listing_variant_id = agg.listing_variant_id
           and not ps.is_void
           and ps.stock_status <> 'sold_out'
           and ps.sale_price = agg.low_price) as low_at
  from agg;

-- 권한 (docs/database.md §6: 새 뷰는 같은 마이그레이션에서 권한 부여)
grant select on public.v_listing_health, public.v_variant_price_summary
  to anon, authenticated, service_role;
