import Link from "next/link";
import { Badge } from "@/components/Badge";
import { formatAgo, formatKRW, formatKstDate, formatSignedPct } from "@/lib/format";
import { healthBadge } from "@/lib/pricing/labels";
import type { ProductSummary } from "@/lib/pricing/summary";
import type { ProductListItem } from "@/lib/repositories/product-list";

function priceRange(s: ProductSummary): string {
  if (s.currentMin === null || s.currentMax === null) return "—";
  return s.currentMin === s.currentMax ? formatKRW(s.currentMin) : `${formatKRW(s.currentMin)}~`;
}

export function ProductTable({ items, now }: { items: ProductListItem[]; now: Date }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-4 font-medium">상품</th>
            <th className="py-2 pr-4 text-right font-medium">옵션</th>
            <th className="py-2 pr-4 text-right font-medium">현재가</th>
            <th className="py-2 pr-4 text-right font-medium">수집 기간 최저가</th>
            <th className="py-2 pr-4 font-medium">최저가에 가장 가까운 옵션</th>
            <th className="py-2 font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const s = p.summary;
            const stale = s.health === "failing" || s.health === "stale";
            return (
              <tr key={p.id} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                <td className="py-3 pr-4">
                  <Link href={`/products/${p.id}`} className="font-medium underline-offset-2 hover:underline">
                    {p.brandName} {p.name}
                  </Link>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[p.modelNo && `모델 ${p.modelNo}`, p.platformNames.join(", ")].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{s.variantCount}개</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {priceRange(s)}
                  {stale && s.lastSuccessAt && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatAgo(s.lastSuccessAt, now)} 기준</div>
                  )}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {s.periodLow ? (
                    <>
                      {formatKRW(s.periodLow.price)}
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatKstDate(s.periodLow.at)}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 pr-4 text-xs text-zinc-700 dark:text-zinc-300">
                  {s.nearest && s.nearestLowPct !== null ? (
                    <>
                      <div>{s.nearestLowPct === 0 ? "최저가와 동일" : `최저가 ${formatSignedPct(s.nearestLowPct)}`}</div>
                      <div className="text-zinc-500 dark:text-zinc-400">
                        {s.nearest.label} ({formatKRW(s.nearest.current)} / 최저 {formatKRW(s.nearest.low)})
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge label={healthBadge(s, now)} />
                    {s.hasSample && <Badge label={{ text: "샘플", tone: "sample" }} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
