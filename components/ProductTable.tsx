import Link from "next/link";
import { Badge } from "@/components/Badge";
import { GarmentIcon } from "@/components/GarmentIcon";
import { formatAgo, formatKRW, formatKstDate, formatSignedPct } from "@/lib/format";
import { healthBadge } from "@/lib/pricing/labels";
import type { ProductSummary } from "@/lib/pricing/summary";
import type { ProductListItem } from "@/lib/repositories/product-list";

function priceRange(s: ProductSummary): string {
  if (s.currentMin === null || s.currentMax === null) return "—";
  return s.currentMin === s.currentMax ? formatKRW(s.currentMin) : `${formatKRW(s.currentMin)}~`;
}

const th = "whitespace-nowrap py-3 pr-4 font-medium";

export function ProductTable({ items, now }: { items: ProductListItem[]; now: Date }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-zinc-400">
          <tr className="border-b border-zinc-800">
            <th className={`${th} w-full pl-5`}>상품</th>
            <th className={`${th} hidden text-right lg:table-cell`}>옵션</th>
            <th className={`${th} text-right`}>현재가</th>
            <th className={`${th} hidden text-right lg:table-cell`}>수집 기간 최저가</th>
            <th className={`${th} hidden xl:table-cell`}>최저가에 가장 가까운 옵션</th>
            <th className={`${th} hidden sm:table-cell`}>상태</th>
            <th className="py-3 pr-5">
              <span className="sr-only">상세</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {items.map((p) => {
            const s = p.summary;
            const stale = s.health === "failing" || s.health === "stale";
            return (
              <tr key={p.id} className="align-middle transition-colors hover:bg-zinc-800/30">
                <td className="min-w-48 py-3 pr-4 pl-5">
                  <div className="flex items-center gap-3">
                    <GarmentIcon name={`${p.category ?? ""} ${p.name}`} color={s.nearest?.label ?? ""} />
                    <div className="min-w-0">
                      <Link href={`/products/${p.id}`} className="font-semibold text-zinc-50 underline-offset-2 hover:underline">
                        {p.brandName} {p.name}
                      </Link>
                      <div className="text-xs text-zinc-400">
                        {[p.modelNo && `모델 ${p.modelNo}`, p.platformNames.join(", ")].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap py-3 pr-4 text-right tabular-nums text-zinc-200 lg:table-cell">{s.variantCount}개</td>
                <td className="whitespace-nowrap py-3 pr-4 text-right text-base font-bold tabular-nums text-zinc-50">
                  {priceRange(s)}
                  {stale && s.lastSuccessAt && (
                    <div className="text-xs font-normal text-zinc-400">{formatAgo(s.lastSuccessAt, now)} 기준</div>
                  )}
                </td>
                <td className="hidden whitespace-nowrap py-3 pr-4 text-right tabular-nums lg:table-cell">
                  {s.periodLow ? (
                    <>
                      <div className="font-semibold text-zinc-100">{formatKRW(s.periodLow.price)}</div>
                      <div className="text-xs text-zinc-400">{formatKstDate(s.periodLow.at)}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden min-w-48 py-3 pr-4 text-xs xl:table-cell">
                  {s.nearest && s.nearestLowPct !== null ? (
                    <>
                      <div className={`whitespace-nowrap font-semibold ${s.nearestLowPct === 0 ? "text-accent" : "text-zinc-100"}`}>
                        {s.nearestLowPct === 0 ? "최저가와 동일" : `최저가 ${formatSignedPct(s.nearestLowPct)}`}
                      </div>
                      <div className="text-zinc-400">
                        {s.nearest.label}{" "}
                        <span className="whitespace-nowrap">
                          ({formatKRW(s.nearest.current)}
                          {s.nearestLowPct !== 0 && ` / 최저 ${formatKRW(s.nearest.low)}`})
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="hidden whitespace-nowrap py-3 pr-4 sm:table-cell">
                  <div className="flex flex-col items-start gap-1">
                    <Badge label={healthBadge(s, now)} />
                    {s.hasSample && <Badge label={{ text: "샘플", tone: "sample" }} />}
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pr-5 text-right">
                  <Link
                    href={`/products/${p.id}`}
                    aria-label={`${p.brandName} ${p.name} 상세보기`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-inset ring-zinc-600 hover:bg-zinc-800 hover:text-zinc-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                    </svg>
                    상세보기
                    <span aria-hidden>›</span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
