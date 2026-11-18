-- 0003 collection_runs, collection_attempts, price_snapshots (+ 무결성 트리거, 샘플 삭제 함수)
-- docs/database.md §3.7–3.9, §7

-- 3.8 collection_runs ------------------------------------------------------
create table public.collection_runs (
  id          bigint generated always as identity primary key,
  platform_id smallint not null references public.platforms (id) on delete restrict,
  trigger     public.run_trigger not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      public.run_status not null default 'running',
  total       integer not null default 0 check (total >= 0),
  succeeded   integer not null default 0 check (succeeded >= 0),
  failed      integer not null default 0 check (failed >= 0),
  check (finished_at is null or finished_at >= started_at)
);

-- 3.9 collection_attempts --------------------------------------------------
-- 실패 시도는 스냅샷 없이 남는다. "수집 실패"와 "수집 안 함"을 구분하는 근거.
create table public.collection_attempts (
  id           bigint generated always as identity primary key,
  run_id       bigint references public.collection_runs (id) on delete restrict,
  listing_id   bigint not null references public.listings (id) on delete restrict,
  attempted_at timestamptz not null default now(),
  outcome      public.attempt_outcome not null,
  http_status  smallint,
  error_detail text check (error_detail is null or length(error_detail) <= 1000),
  duration_ms  integer check (duration_ms is null or duration_ms >= 0)
);

create index collection_attempts_listing_time_idx
  on public.collection_attempts (listing_id, attempted_at desc);
create index collection_attempts_run_id_idx on public.collection_attempts (run_id);

-- 3.7 price_snapshots ------------------------------------------------------
-- append-only. 보간·추정 값은 저장하지 않는다 (PRD 원칙 P1).
create table public.price_snapshots (
  id                 bigint generated always as identity primary key,
  listing_variant_id bigint not null references public.listing_variants (id) on delete restrict,
  attempt_id         bigint not null references public.collection_attempts (id) on delete restrict,
  collected_at       timestamptz not null,
  list_price         integer check (list_price > 0),
  sale_price         integer not null check (sale_price > 0),
  member_price       integer check (member_price > 0),
  stock_status       public.stock_status not null default 'unknown',
  currency           char(3) not null default 'KRW',
  source             public.price_source not null,
  is_void            boolean not null default false,
  void_reason        text,
  created_at         timestamptz not null default now(),
  check (list_price is null or sale_price <= list_price),
  check (not is_void or void_reason is not null),
  unique (listing_variant_id, collected_at)
);

comment on column public.price_snapshots.sale_price is
  '비교 기준 가격: 로그인 없이 보이는 판매가. 회원가·쿠폰가는 비교에 쓰지 않는다.';

create index price_snapshots_variant_time_idx
  on public.price_snapshots (listing_variant_id, collected_at desc) where not is_void;
create index price_snapshots_attempt_id_idx on public.price_snapshots (attempt_id);

-- INSERT 검증 ---------------------------------------------------------------
-- 1) 미래 시각 금지 2) 성공한 시도에만 연결 3) 시도와 옵션이 같은 리스팅
-- 4) 샘플 상품 ↔ source='sample' 일치 (샘플과 실제 데이터가 섞이지 않게)
create or replace function public.price_snapshots_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_attempt_listing bigint;
  v_attempt_outcome public.attempt_outcome;
  v_variant_listing bigint;
  v_is_sample       boolean;
begin
  if new.collected_at > now() + interval '5 minutes' then
    raise exception 'collected_at 은 미래일 수 없습니다: %', new.collected_at;
  end if;

  if new.is_void then
    raise exception '무효 상태로 INSERT 할 수 없습니다. 기록 후 is_void 를 UPDATE 하세요.';
  end if;

  select a.listing_id, a.outcome into v_attempt_listing, v_attempt_outcome
    from public.collection_attempts a where a.id = new.attempt_id;
  if v_attempt_outcome is distinct from 'success' then
    raise exception '성공한 수집 시도에만 가격을 기록할 수 있습니다 (attempt %, outcome %)',
      new.attempt_id, v_attempt_outcome;
  end if;

  select lv.listing_id, p.is_sample into v_variant_listing, v_is_sample
    from public.listing_variants lv
    join public.listings l on l.id = lv.listing_id
    join public.products p on p.id = l.product_id
   where lv.id = new.listing_variant_id;
  if v_variant_listing is distinct from v_attempt_listing then
    raise exception '수집 시도의 리스팅(%)과 옵션의 리스팅(%)이 다릅니다',
      v_attempt_listing, v_variant_listing;
  end if;

  if v_is_sample <> (new.source = 'sample') then
    raise exception '샘플 상품에는 source=sample 만, 실제 상품에는 sample 이 아닌 source 만 기록할 수 있습니다';
  end if;

  return new;
end;
$$;

create trigger price_snapshots_before_insert
  before insert on public.price_snapshots
  for each row execute function public.price_snapshots_before_insert();

-- UPDATE 제한: is_void / void_reason 만, 무효 → 유효 되돌리기 금지 ---------------
create or replace function public.price_snapshots_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.listing_variant_id, new.attempt_id, new.collected_at, new.list_price,
      new.sale_price, new.member_price, new.stock_status, new.currency, new.source, new.created_at)
     is distinct from
     (old.id, old.listing_variant_id, old.attempt_id, old.collected_at, old.list_price,
      old.sale_price, old.member_price, old.stock_status, old.currency, old.source, old.created_at)
  then
    raise exception 'price_snapshots 는 append-only 입니다. is_void, void_reason 만 수정할 수 있습니다.';
  end if;
  if old.is_void and not new.is_void then
    raise exception '무효 처리된 기록은 되돌릴 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger price_snapshots_before_update
  before update on public.price_snapshots
  for each row execute function public.price_snapshots_before_update();

-- DELETE 금지: purge_sample_data() 안에서 샘플 행만 예외 ------------------------
create or replace function public.price_snapshots_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source = 'sample' and current_setting('app.allow_sample_purge', true) = 'on' then
    return old;
  end if;
  raise exception 'price_snapshots 는 삭제할 수 없습니다. 잘못된 기록은 is_void 로 처리하세요.';
end;
$$;

create trigger price_snapshots_before_delete
  before delete on public.price_snapshots
  for each row execute function public.price_snapshots_before_delete();

-- 샘플 데이터 일괄 삭제 ------------------------------------------------------------
-- 실제 수집 데이터(is_sample = false)는 건드리지 않는다.
create or replace function public.purge_sample_data()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_listings  bigint[];
  v_brands    bigint[];
  v_snapshots integer;
  v_attempts  integer;
  v_runs      integer;
  v_products  integer;
begin
  perform set_config('app.allow_sample_purge', 'on', true);

  select coalesce(array_agg(l.id), '{}') into v_listings
    from public.listings l
    join public.products p on p.id = l.product_id
   where p.is_sample;
  select coalesce(array_agg(distinct p.brand_id), '{}') into v_brands
    from public.products p where p.is_sample;

  delete from public.price_snapshots where source = 'sample';
  get diagnostics v_snapshots = row_count;

  delete from public.collection_attempts where listing_id = any (v_listings);
  get diagnostics v_attempts = row_count;

  delete from public.collection_runs r
   where r.trigger = 'seed'
     and not exists (select 1 from public.collection_attempts a where a.run_id = r.id);
  get diagnostics v_runs = row_count;

  delete from public.listing_variants where listing_id = any (v_listings);
  delete from public.listings where id = any (v_listings);
  delete from public.product_variants
   where product_id in (select id from public.products where is_sample);
  delete from public.products where is_sample;
  get diagnostics v_products = row_count;

  delete from public.brands b
   where b.id = any (v_brands)
     and not exists (select 1 from public.products p where p.brand_id = b.id);

  delete from public.platforms pl
   where pl.collection_mode = 'sample'
     and not exists (select 1 from public.listings l where l.platform_id = pl.id)
     and not exists (select 1 from public.collection_runs r where r.platform_id = pl.id);

  perform set_config('app.allow_sample_purge', 'off', true);

  return jsonb_build_object(
    'snapshots', v_snapshots, 'attempts', v_attempts, 'runs', v_runs, 'products', v_products
  );
end;
$$;

revoke all on function public.purge_sample_data() from public;
