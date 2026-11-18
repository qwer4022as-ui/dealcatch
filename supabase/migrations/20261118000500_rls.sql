-- 0005 RLS
-- docs/database.md §6
-- 브라우저(anon, authenticated)는 읽기만. 쓰기는 서버의 service_role 로만 한다.
-- service_role 은 RLS 를 우회하므로 별도 정책이 필요 없다.

do $$
declare
  t text;
begin
  foreach t in array array[
    'platforms', 'brands', 'products', 'product_variants', 'listings', 'listing_variants',
    'collection_runs', 'collection_attempts', 'price_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t
    );
    -- RLS 와 별개로 쓰기 권한 자체를 회수 (이중 방어)
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

revoke execute on function public.purge_sample_data() from anon, authenticated;
