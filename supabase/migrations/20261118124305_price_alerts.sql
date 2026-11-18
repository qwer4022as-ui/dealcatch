-- 0011 가격 알림
-- 1) 상품별 목표가 (관리자 설정, 서버만 읽고 쓴다)
-- 2) 옵션별 "수집 기간 최저가에 처음 도달한 시각" → 최근 최저가 갱신 판단에 사용
-- docs/database.md §3.10

create table public.price_alerts (
  product_id   bigint primary key references public.products (id) on delete cascade,
  target_price integer check (target_price is null or (target_price > 0 and target_price <= 100000000)),
  updated_at   timestamptz not null default now()
);

comment on table public.price_alerts is
  '상품별 목표가. 판매 중인 옵션의 현재가가 목표가 이하이면 알림. 설정값이므로 상품 삭제 시 함께 삭제된다.';

-- 브라우저에는 노출하지 않는다: RLS 켜고 정책 없음 + anon/authenticated 권한 없음
alter table public.price_alerts enable row level security;
revoke all on public.price_alerts from anon, authenticated;
grant select, insert, update, delete on public.price_alerts to service_role;

-- 옵션별 요약 뷰에 low_first_at 추가 (기존 열 뒤에 추가)
create or replace view public.v_variant_price_summary
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
           and ps.sale_price = agg.low_price) as low_at,
       (select min(ps.collected_at)
          from public.price_snapshots ps
         where ps.listing_variant_id = agg.listing_variant_id
           and not ps.is_void
           and ps.stock_status <> 'sold_out'
           and ps.sale_price = agg.low_price) as low_first_at
  from agg;
