import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/Badge";
import { GarmentIcon } from "@/components/GarmentIcon";
import { HeroArt } from "@/components/HeroArt";
import { ListingCompare } from "@/components/ListingCompare";
import { NarrativeCard } from "@/components/NarrativeCard";
import { TargetPriceForm } from "@/components/TargetPriceForm";
import { PriceChart } from "@/components/PriceChart";
import { PriceSummary } from "@/components/PriceSummary";
import { SampleBanner } from "@/components/SampleBanner";
import { VoidButton } from "@/components/VoidButton";
import { isAdmin } from "@/lib/auth/admin";
import { formatKRW, formatKstDateTime } from "@/lib/format";
import { buildChartSeries } from "@/lib/pricing/chart";
import { outcomeLabel, sourceBadge } from "@/lib/pricing/labels";
import { computePriceStats } from "@/lib/pricing/stats";
import { targetHit } from "@/lib/pricing/alerts";
import { buildNarrative } from "@/lib/pricing/narrative";
import { compareListings } from "@/lib/pricing/compare";
import { getTarget } from "@/lib/repositories/alerts";
import { getListingComparison, getProductDetail, getVariantHistory } from "@/lib/repositories/product-detail";

const RECENT_LIMIT = 20;

export default function ProductPage(props: PageProps<"/products/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
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
  const compareRows = compareListings(await getListingComparison(product, now));
  const admin = await isAdmin();
  // 목표가는 관리자에게만 보인다 (price_alerts 는 서버 전용)
  const target = admin && !product.isSample ? await getTarget(product.id) : null;
  const alertVariants = product.variants.map((v) => ({
    label: `${v.platformName} · ${v.optionLabel}`,
    latestPrice: v.latestPrice,
    latestStock: v.latestStock,
    lowPrice: null,
    lowFirstAt: null,
    firstCollectedAt: null,
  }));
  const hit = targetHit({ productId: product.id, name: product.name, isSample: product.isSample, targetPrice: target, variants: alertVariants });
  const inStock = product.variants.filter((v) => v.latestPrice !== null && v.latestStock !== "sold_out").map((v) => v.latestPrice as number);

  return (
    <>
      {product.isSample && <SampleBanner />}

      <header className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="hero-fade flex items-center gap-5">
          <GarmentIcon size="lg" name={`${product.category ?? ""} ${product.name}`} color={selected?.optionLabel ?? ""} />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="text-sm text-zinc-300">{product.brandName}</div>
            <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-zinc-50 sm:text-3xl">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
              {product.modelNo && (
                <span className="whitespace-nowrap">
                  <span className="text-zinc-400">모델번호</span> {product.modelNo}
                </span>
              )}
              {product.category && (
                <>
                  <span aria-hidden className="h-3.5 w-px bg-zinc-700" />
                  <span>{product.category}</span>
                </>
              )}
              {product.listings.map((l) => (
                <span key={l.id} className="flex items-center gap-3">
                  <span aria-hidden className="h-3.5 w-px bg-zinc-700" />
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap text-accent underline decoration-accent/50 underline-offset-4 hover:decoration-accent"
                  >
                    {l.platformName}에서 보기 ↗
                  </a>
                </span>
              ))}
            </div>
          </div>
        </div>
        <HeroArt className="hidden max-w-[520px] lg:block" />
      </header>

      {product.variants.length > 0 && (
        <nav aria-label="옵션 선택" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
                <path d="M3 12.6V4.4A1.4 1.4 0 0 1 4.4 3h8.2l8.4 8.4a1.4 1.4 0 0 1 0 2l-7.6 7.6a1.4 1.4 0 0 1-2 0z" />
                <circle cx="7.6" cy="7.6" r="1.4" />
              </svg>
              옵션 선택
            </h2>
            <span className="text-xs text-zinc-400">옵션을 고르면 아래 요약과 그래프가 그 옵션 기준으로 바뀝니다.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {product.variants.map((v) => {
              const active = v.listingVariantId === selected?.listingVariantId;
              return (
                <Link
                  key={v.listingVariantId}
                  href={`/products/${product.id}?variant=${v.listingVariantId}`}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`flex items-center gap-4 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset transition-colors ${
                    active
                      ? "bg-accent/15 text-zinc-50 ring-2 ring-accent shadow-[0_0_24px_-10px_rgb(185_164_255/0.7)]"
                      : "bg-zinc-900/50 text-zinc-200 ring-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  <span>
                    <span className="text-zinc-400">{v.platformName}</span> {v.optionLabel}
                  </span>
                  <span className="font-bold tabular-nums">
                    {v.latestPrice !== null ? formatKRW(v.latestPrice) : "—"}
                    {v.latestStock === "sold_out" && <span className="ml-1 text-xs font-normal text-zinc-400">품절</span>}
                  </span>
                  {active && (
                    <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-zinc-950">
                      ✓
                    </span>
                  )}
                </Link>
              );
            })}
            {!product.isSample && (
              <>
                <span aria-hidden className="mx-1 hidden h-8 w-px bg-zinc-700 sm:block" />
                <Link
                  href={`/products/${product.id}/prices/new${selected ? `?listing=${selected.listingId}` : ""}`}
                  className="flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-accent ring-1 ring-inset ring-accent/60 hover:bg-accent/10"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
                  </svg>
                  수동 가격 입력
                </Link>
              </>
            )}
          </div>
        </nav>
      )}

      {admin && !product.isSample && (
        <TargetPriceForm
          productId={product.id}
          target={target}
          hit={hit && { label: hit.label, price: hit.price }}
          cheapest={inStock.length ? Math.min(...inStock) : null}
        />
      )}

      {selected ? (
        <VariantSection
          productId={product.id}
          canVoid={!product.isSample && admin}
          listingVariantId={selected.listingVariantId}
          listingId={selected.listingId}
          platformName={selected.platformName}
          optionLabel={selected.optionLabel}
          now={now}
        />
      ) : (
        <p className="text-sm text-zinc-400">등록된 옵션이 없습니다.</p>
      )}

      <ListingCompare rows={compareRows} now={now} />
    </>
  );
}

async function VariantSection({
  productId,
  canVoid,
  listingVariantId,
  listingId,
  platformName,
  optionLabel,
  now,
}: {
  productId: number;
  /** 관리자이고 샘플 상품이 아닐 때만 무효 처리 버튼을 보인다 */
  canVoid: boolean;
  listingVariantId: number;
  listingId: number;
  platformName: string;
  optionLabel: string;
  now: Date;
}) {
  const history = await getVariantHistory(listingVariantId, listingId);
  const stats = computePriceStats(history.snapshots, history.attempts, now);
  const points = buildChartSeries(history.snapshots);
  const priceByAttempt = new Map(history.snapshots.map((s) => [s.attemptId, s]));
  const recent = history.attempts.slice(0, RECENT_LIMIT);

  const th = "whitespace-nowrap px-3 py-2.5 font-medium";
  return (
    <>
      <PriceSummary stats={stats} now={now} variantLabel={`${platformName} · ${optionLabel}`} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="card flex min-w-0 flex-col gap-6 p-5">
          <PriceChart points={points} nowMs={now.getTime()} embedded />

          <section aria-label="최근 가격 기록" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
                  <rect x="5" y="4" width="14" height="17" rx="2" />
                  <path d="M9 3h6v3H9zM9 11h6M9 15h4" />
                </svg>
                최근 가격 기록
              </h2>
              <span className="text-xs text-zinc-400">최근 {recent.length}건 · 시각은 KST</span>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-zinc-400">수집 기록이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-zinc-900/80 text-left text-xs text-zinc-400">
                    <tr>
                      <th className={th}>날짜</th>
                      <th className={th}>판매처</th>
                      <th className={th}>옵션</th>
                      <th className={`${th} text-right`}>가격</th>
                      <th className={th}>상태</th>
                      <th className={th}>출처</th>
                      {canVoid && <th className={th}>관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {recent.map((a) => {
                      const s = priceByAttempt.get(a.id);
                      return (
                        <tr key={a.id} className="hover:bg-zinc-800/30">
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-zinc-200">{formatKstDateTime(a.attemptedAt)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span className="inline-flex items-center gap-2">
                              <span aria-hidden className="grid h-5 w-5 place-items-center rounded bg-zinc-100 text-[10px] font-black text-zinc-950">
                                {platformName.slice(0, 1)}
                              </span>
                              {platformName}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-zinc-300">{optionLabel}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-zinc-50">
                            {s ? <span className={s.isVoid ? "line-through opacity-60" : undefined}>{formatKRW(s.salePrice)}</span> : "—"}
                            {s?.stockStatus === "sold_out" && <span className="ml-1 text-xs font-normal text-zinc-400">품절</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {a.outcome === "success" ? (
                              s?.isVoid ? (
                                <span className="text-xs text-zinc-400" title={s.voidReason ?? undefined}>
                                  무효 처리{s.voidReason && ` · ${s.voidReason}`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent ring-1 ring-inset ring-accent/40">
                                  ✓ 수집 완료
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-300 ring-1 ring-inset ring-red-400/40" title={a.errorDetail ?? undefined}>
                                ✕ {outcomeLabel(a.outcome)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">{s ? <Badge label={sourceBadge(s.source)} /> : "—"}</td>
                          {canVoid && (
                            <td className="px-3 py-2.5 align-top">
                              {s && !s.isVoid && s.source !== "sample" && (
                                <VoidButton productId={productId} listingVariantId={listingVariantId} snapshotId={s.id} />
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <NarrativeCard narrative={buildNarrative(stats, now)} />
      </div>
    </>
  );
}
