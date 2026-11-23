import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ProductTable } from "@/components/ProductTable";
import { SampleBanner } from "@/components/SampleBanner";
import { StatCard, StatIcons } from "@/components/StatCard";
import { NEW_LOW_DAYS } from "@/lib/pricing/alerts";
import { NEAR_LOW_PCT } from "@/lib/pricing/summary";
import {
  applyListFilter,
  categoryOf,
  distinctSorted,
  listStats,
  parseListFilter,
  type ListFilter,
} from "@/lib/products/filter";
import { listProducts } from "@/lib/repositories/product-list";

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <section>
        <div className="flex flex-col gap-2">
          <h1 className="hero-fade text-3xl font-extrabold tracking-tight sm:text-4xl">상품</h1>
          <p className="hero-fade-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
            가격을 추적 중인 의류 상품을 검색하고, 가격 변동과 최저가 옵션을 한눈에 비교하세요.
          </p>
        </div>
      </section>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <ProductList {...props} />
      </Suspense>
    </main>
  );
}

type Params = { q: string; filter: ListFilter };

/** 현재 검색·필터를 유지한 채 일부만 바꾼 주소 */
function hrefWith({ q, filter }: Params, change: Partial<ListFilter>): string {
  const f = { ...filter, ...change };
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (f.view !== "all") sp.set("view", f.view);
  if (f.brand) sp.set("brand", f.brand);
  if (f.category) sp.set("cat", f.category);
  const s = sp.toString();
  return s ? `/products?${s}` : "/products";
}

const chipBase = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors";
const chipOn = `${chipBase} bg-accent/20 text-accent ring-accent/50`;
const chipOff = `${chipBase} text-zinc-200 ring-zinc-700 hover:bg-zinc-800`;

function Chip({ href, active, icon, children }: { href: string; active: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={active ? chipOn : chipOff}>
      {icon}
      {children}
    </Link>
  );
}

/** JS 없이 열고 닫는 선택 메뉴 */
function Dropdown({ label, selected, options, hrefFor }: {
  label: string;
  selected: string | null;
  options: string[];
  hrefFor: (v: string | null) => string;
}) {
  return (
    <details className="group relative">
      <summary className={`${selected ? chipOn : chipOff} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        {selected ?? label}
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <ul className="absolute right-0 z-30 mt-2 max-h-72 min-w-44 overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl shadow-black/50">
        <li>
          <Link href={hrefFor(null)} className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            {label} 전체
          </Link>
        </li>
        {options.map((o) => (
          <li key={o}>
            <Link
              href={hrefFor(o)}
              aria-current={o === selected ? "true" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm hover:bg-zinc-800 ${o === selected ? "text-accent" : "text-zinc-100"}`}
            >
              {o}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

async function ProductList({ searchParams }: PageProps<"/products">) {
  await connection();
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const filter = parseListFilter(params);
  const p: Params = { q, filter };
  const now = new Date();
  const all = await listProducts(q || undefined, now);
  const items = applyListFilter(all, filter);
  const stats = listStats(all, now);
  const brands = distinctSorted(all.map((x) => x.brandName));
  const categories = distinctSorted(all.map(categoryOf));
  const filtered = filter.view !== "all" || filter.brand || filter.category;

  return (
    <>
      <section aria-label="요약" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={StatIcons.hanger} label="추적 상품" value={stats.total} />
        <StatCard icon={StatIcons.tag} label="최저가 동일" value={stats.atLow} note="현재가 = 수집 기간 최저가" />
        <StatCard icon={StatIcons.trendDown} label="최근 최저가 갱신" value={stats.recentNewLow} note={`최근 ${NEW_LOW_DAYS}일`} tone="green" />
        <StatCard icon={StatIcons.refresh} label="데이터 갱신 필요" value={stats.needsUpdate} note="오래됨 · 수집 실패" tone="amber" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <form action="/products" role="search" className="flex min-w-72 flex-1 items-center gap-2 rounded-2xl bg-zinc-900/70 p-1.5 pl-4 ring-1 ring-inset ring-accent/40 focus-within:ring-accent">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <label htmlFor="q" className="sr-only">
            상품명, 브랜드, 모델번호 검색
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="상품명, 브랜드, 모델번호 검색"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none"
          />
          {filter.view !== "all" && <input type="hidden" name="view" value={filter.view} />}
          {filter.brand && <input type="hidden" name="brand" value={filter.brand} />}
          {filter.category && <input type="hidden" name="cat" value={filter.category} />}
          <button type="submit" className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-accent-strong">
            검색
          </button>
        </form>

        <span aria-hidden className="hidden h-8 w-px bg-zinc-700 lg:block" />

        <nav aria-label="목록 필터" className="flex flex-wrap items-center gap-2">
          <Chip href={hrefWith(p, { view: "all", brand: null, category: null })} active={!filtered}>
            전체
          </Chip>
          <Chip
            href={hrefWith(p, { view: filter.view === "near" ? "all" : "near" })}
            active={filter.view === "near"}
            icon={<span className="h-4 w-4">{StatIcons.tag}</span>}
          >
            최저가 임박
          </Chip>
          <Chip
            href={hrefWith(p, { view: filter.view === "recent" ? "all" : "recent" })}
            active={filter.view === "recent"}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
            }
          >
            최근 확인순
          </Chip>
          <Dropdown label="브랜드" selected={filter.brand} options={brands} hrefFor={(v) => hrefWith(p, { brand: v })} />
          <Dropdown label="카테고리" selected={filter.category} options={categories} hrefFor={(v) => hrefWith(p, { category: v })} />
        </nav>
      </div>

      {all.some((x) => x.isSample) && <SampleBanner />}

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center text-sm text-zinc-400">
          <p>{q ? `"${q}"에 해당하는 상품이 없습니다.` : filtered ? "조건에 맞는 상품이 없습니다." : "등록된 상품이 없습니다."}</p>
          {(q || filtered) && (
            <Link href="/products" className={chipOff}>
              검색·필터 초기화
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span className="font-semibold text-zinc-200">{items.length}개</span>
            <span aria-hidden>·</span>
            {filter.view === "recent" ? "최근 확인한 순" : "수집 기간 최저가에 가까운 순"}
            {filter.view === "near" && <span>(최저가 +{NEAR_LOW_PCT}% 이내)</span>}
            {(q || filtered) && (
              <Link href="/products" className="ml-1 text-accent underline-offset-2 hover:underline">
                초기화
              </Link>
            )}
          </p>
          <ProductTable items={items} now={now} />
        </>
      )}
    </>
  );
}
