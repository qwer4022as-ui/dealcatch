-- 0001 enums
-- docs/database.md §4

create type public.collection_mode as enum ('disabled', 'manual', 'sample', 'api', 'crawl');
create type public.listing_status  as enum ('active', 'paused', 'not_found', 'ended');
create type public.stock_status    as enum ('in_stock', 'low', 'sold_out', 'unknown');
create type public.price_source    as enum ('sample', 'manual', 'api', 'crawl');
create type public.run_trigger     as enum ('cron', 'manual', 'seed');
create type public.run_status      as enum ('running', 'succeeded', 'partial', 'failed');
create type public.attempt_outcome as enum (
  'success', 'http_error', 'blocked', 'not_found', 'parse_error', 'timeout', 'policy_disabled', 'unknown'
);
