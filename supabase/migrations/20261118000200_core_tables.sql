-- 0002 core tables: platforms, brands, products, product_variants, listings, listing_variants
-- docs/database.md §3.1–3.6

create extension if not exists pg_trgm with schema extensions;

-- 3.1 platforms ------------------------------------------------------------
create table public.platforms (
  id                       smallint generated always as identity primary key,
  code                     text not null unique,
  name                     text not null,
  base_url                 text,
  collection_mode          public.collection_mode not null default 'disabled',
  policy_reviewed_at       timestamptz,
  policy_note              text,
  collect_interval_minutes integer check (collect_interval_minutes >= 60),
  is_paused                boolean not null default false
);

comment on column public.platforms.collection_mode is
  '자동 수집은 api/crawl일 때만 실행된다. 정책 검토 전에는 disabled.';

-- 실제 플랫폼은 정책 검토 전이므로 모두 disabled 로 등록한다 (PRD §6).
insert into public.platforms (code, name, base_url) values
  ('musinsa',  '무신사', 'https://www.musinsa.com'),
  ('29cm',     '29CM',   'https://www.29cm.co.kr'),
  ('wconcept', 'W컨셉',  'https://www.wconcept.co.kr');

-- 3.2 brands ---------------------------------------------------------------
create table public.brands (
  id              bigint generated always as identity primary key,
  name            text not null check (length(trim(name)) > 0),
  name_normalized text generated always as (lower(regexp_replace(name, '\s+', '', 'g'))) stored unique
);

-- 3.3 products -------------------------------------------------------------
create table public.products (
  id         bigint generated always as identity primary key,
  brand_id   bigint not null references public.brands (id) on delete restrict,
  name       text not null check (length(trim(name)) > 0),
  model_no   text check (model_no is null or length(trim(model_no)) > 0),
  category   text,
  is_sample  boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index products_brand_model_no_key
  on public.products (brand_id, model_no) where model_no is not null;
create index products_brand_id_idx on public.products (brand_id);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_model_no_trgm_idx on public.products using gin (model_no extensions.gin_trgm_ops);

-- 3.4 product_variants -----------------------------------------------------
-- 색상·사이즈가 없으면 빈 문자열을 쓴다 (NULL 이면 유니크 제약이 동작하지 않음).
create table public.product_variants (
  id         bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete restrict,
  color      text not null default '',
  color_code text,
  size       text not null default '',
  sku        text,
  unique (product_id, color, size)
);

-- 3.5 listings -------------------------------------------------------------
create table public.listings (
  id                   bigint generated always as identity primary key,
  product_id           bigint not null references public.products (id) on delete restrict,
  platform_id          smallint not null references public.platforms (id) on delete restrict,
  external_id          text not null check (length(trim(external_id)) > 0),
  url                  text not null,
  title_on_platform    text,
  status               public.listing_status not null default 'active',
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  created_at           timestamptz not null default now(),
  unique (platform_id, external_id)
);

create index listings_product_id_idx on public.listings (product_id);

-- 3.6 listing_variants -----------------------------------------------------
create table public.listing_variants (
  id                 bigint generated always as identity primary key,
  listing_id         bigint not null references public.listings (id) on delete restrict,
  product_variant_id bigint references public.product_variants (id) on delete set null,
  external_option_id text,
  option_label_raw   text not null,
  is_active          boolean not null default true,
  unique (listing_id, option_label_raw)
);

create index listing_variants_product_variant_id_idx on public.listing_variants (product_variant_id);
