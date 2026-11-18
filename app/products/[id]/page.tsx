import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/Badge";
import { PriceChart } from "@/components/PriceChart";
import { PriceSummary } from "@/components/PriceSummary";
import { formatKRW, formatKstDateTime } from "@/lib/format";
import { buildChartSeries } from "@/lib/pricing/chart";
import { outcomeLabel, sourceBadge } from "@/lib/pricing/labels";
import { computePriceStats } from "@/lib/pricing/stats";
import { getProductDetail, getVariantHistory } from "@/lib/repositories/product-detail";

const RECENT_LIMIT = 20;

export default function ProductPage(props: PageProps<"/products/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <ProductDetailView {...props} />
      </Suspense>
    </main>
  );
}

async function ProductDetailView({ params, searchParams }: PageProps<"/products/[id]">) {
  await connection(); // 요청마다 최신 가격과 현재 시각을 사용
  const { id } = await params;
  const { variant } = await searchParams;

  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const product = await getProductDetail(productId);
  if (!product) notFound();

  const requested = Number(Array.isArray(variant) ? variant[0] : variant);
  const selected =
    product.variants.find((v) => v.listingVariantId === requested) ?? product.variants[0] ?? null;

  const now = new Date();

  return (
    <>
      {product.isSample && (
        <div className="rounded-md bg-violet-50 px-4 py-2 text-sm text-violet-900 dark:bg-violet-950 dark:text-violet-100">
          ◇ 샘플 데이터입니다. 가상 브랜드·가상 상품이며 실제 가격 이력이 아닙니다.
        </div>
      )}

      <header className="flex flex-col gap-1">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{product.brandName}</div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <div className="flex flex-wrap gap-x-3 text-sm text-zinc-600 dark:text-zinc-400">
          {product.modelNo && <span>모델번호 {product.modelNo}</span>}
          {product.category && <span>{product.category}</span>}
          {product.listings.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {l.platformName}에서 보기 ↗
            </a>
          ))}
        </div>
      </header>

      {product.variants.length > 0 && (
        <nav aria-label="옵션 선택" className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">옵션별 현재가</h2>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const active = v.listingVariantId === selected?.listingVariantId;
              return (
                <Link
                  key={v.listingVariantId}
                  href={`/products/${product.id}?variant=${v.listingVariantId}`}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ${
                    active
                      ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100"
                      : "ring-zinc-300 hover:bg-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-xs opacity-75">{v.platformName}</span> {v.optionLabel}
                  <span className="ml-2 tabular-nums">
                    {v.latestPrice !== null ? formatKRW(v.latestPrice) : "—"}
                    {v.latestStock === "sold_out" && " · 품절"}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {selected ? (
        <VariantSection
          listingVariantId={selected.listingVariantId}
          listingId={selected.listingId}
          label={`${selected.platformName} · ${selected.optionLabel}`}
          now={now}
        />
      ) : (
        <p className="text-sm text-zinc-600">등록된 옵션이 없습니다.</p>
      )}
    </>
  );
}

async function VariantSection({
  listingVariantId,
  listingId,
  label,
  now,
}: {
  listingVariantId: number;
  listingId: number;
  label: string;
  now: Date;
}) {
  const history = await getVariantHistory(listingVariantId, listingId);
  const stats = computePriceStats(history.snapshots, history.attempts, now);
  const points = buildChartSeries(history.snapshots);
  const priceByAttempt = new Map(history.snapshots.map((s) => [s.attemptId, s]));
  const recent = history.attempts.slice(0, RECENT_LIMIT);

  return (
    <>
      <PriceSummary stats={stats} now={now} variantLabel={label} />
      <PriceChart points={points} nowMs={now.getTime()} />

      <section aria-label="최근 수집 기록" className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">최근 수집 기록 ({recent.length}건)</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-600">수집 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">시각 (KST)</th>
                  <th className="py-2 pr-4 text-right font-medium">판매가</th>
                  <th className="py-2 pr-4 font-medium">결과</th>
                  <th className="py-2 font-medium">출처</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => {
                  const s = priceByAttempt.get(a.id);
                  return (
                    <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-2 pr-4 tabular-nums">{formatKstDateTime(a.attemptedAt)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {s ? (
                          <span className={s.isVoid ? "line-through opacity-60" : undefined}>
                            {formatKRW(s.salePrice)}
                          </span>
                        ) : (
                          "—"
                        )}
                        {s?.stockStatus === "sold_out" && <span className="ml-1 text-xs">품절</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {a.outcome === "success" ? (
                          s?.isVoid ? "무효 처리" : "성공"
                        ) : (
                          <span className="text-red-700 dark:text-red-300" title={a.errorDetail ?? undefined}>
                            ✕ {outcomeLabel(a.outcome)}
                          </span>
                        )}
                      </td>
                      <td className="py-2">{s ? <Badge label={sourceBadge(s.source)} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
