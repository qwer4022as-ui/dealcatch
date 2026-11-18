-- 0006 API 역할 권한 명시
-- 이 프로젝트는 public 스키마의 새 테이블에 anon / authenticated / service_role 권한을
-- 자동으로 부여하지 않는다. 필요한 권한을 명시적으로 부여한다.
-- 규칙: 앞으로 테이블·뷰를 추가하는 마이그레이션은 같은 파일에서 권한도 부여한다.
-- docs/database.md §6

grant usage on schema public to anon, authenticated, service_role;

-- 브라우저(anon, authenticated): 읽기만. 행 단위 접근은 RLS 정책(_public_read)이 결정한다.
grant select on
  public.platforms, public.brands, public.products, public.product_variants,
  public.listings, public.listing_variants,
  public.collection_runs, public.collection_attempts, public.price_snapshots,
  public.v_latest_price, public.v_listing_health
to anon, authenticated;

-- 서버(service_role): 쓰기. price_snapshots 의 수정·삭제 제한은 트리거가 계속 강제한다.
grant select, insert, update, delete on
  public.platforms, public.brands, public.products, public.product_variants,
  public.listings, public.listing_variants,
  public.collection_runs, public.collection_attempts, public.price_snapshots
to service_role;
grant select on public.v_latest_price, public.v_listing_health to service_role;
grant usage, select on all sequences in schema public to service_role;

grant execute on function public.purge_sample_data() to service_role;
