import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProductTable } from "@/components/ProductTable";
import { SampleBanner } from "@/components/SampleBanner";
import { listProducts } from "@/lib/repositories/product-list";

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">상품</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <ProductList {...props} />
      </Suspense>
    </main>
  );
}

async function ProductList({ searchParams }: PageProps<"/products">) {
  await connection();
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const now = new Date();
  const items = await listProducts(query || undefined, now);

  // 최저가에 가까운 순, 비교할 수 없는 상품은 뒤로
  items.sort((a, b) => (a.summary.nearestLowPct ?? Infinity) - (b.summary.nearestLowPct ?? Infinity));

  return (
    <>
      <form action="/products" className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          상품명, 브랜드, 모델번호 검색
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="상품명, 브랜드, 모델번호 검색"
          className="w-full max-w-md rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          검색
        </button>
        {query && (
          <Link href="/products" className="self-center text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400">
            초기화
          </Link>
        )}
      </form>

      {items.some((p) => p.isSample) && <SampleBanner />}

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {query ? `"${query}"에 해당하는 상품이 없습니다.` : "등록된 상품이 없습니다."}
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {items.length}개 · 수집 기간 최저가에 가까운 순
          </p>
          <ProductTable items={items} now={now} />
        </>
      )}
    </>
  );
}
