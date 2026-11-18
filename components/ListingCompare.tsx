import { Badge } from "@/components/Badge";
import { formatAgo, formatKRW, formatKstDate } from "@/lib/format";
import type { ComparedRow } from "@/lib/pricing/compare";
import { healthBadge } from "@/lib/pricing/labels";

/** 판매처(색상 페이지)별 가격 비교표. docs/wireframe.md §3.3 */
export function ListingCompare({ rows, now }: { rows: ComparedRow[]; now: Date }) {
  if (rows.length < 2) return null;
  return (
    <section aria-label="판매처별 가격 비교" className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">판매처·색상별 가격 비교</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-4 font-medium">판매처</th>
              <th className="py-2 pr-4 text-right font-medium">현재가</th>
              <th className="py-2 pr-4 text-right font-medium">수집 기간 최저가</th>
              <th className="py-2 pr-4 font-medium">마지막 기록</th>
              <th className="py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = r.summary;
              const price =
                s.currentMin === null
                  ? "—"
                  : s.currentMin === s.currentMax
                    ? formatKRW(s.currentMin)
                    : `${formatKRW(s.currentMin)}~`;
              return (
                <tr key={r.listingId} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                  <td className="py-2 pr-4">
                    <a href={r.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                      {r.label} ↗
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {price}
                    {r.cheapest && (
                      <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">● 가장 저렴</div>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {s.periodLow ? (
                      <>
                        {formatKRW(s.periodLow.price)}
                        {/* 옵션마다 최저가가 달라 %는 섞일 수 있으므로 표시하지 않는다 (옵션별 %는 가격 요약 참고) */}
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatKstDate(s.periodLow.at)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {s.lastSuccessAt ? formatAgo(s.lastSuccessAt, now) : "기록 없음"}
                  </td>
                  <td className="py-2">
                    <Badge label={healthBadge(s, now)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        ⓘ 판매처마다 마지막 기록 시각이 달라 같은 시점의 가격이 아닐 수 있습니다. 옵션별 최저가 대비 %는 아래 가격 요약에서 확인하세요.
      </p>
    </section>
  );
}
