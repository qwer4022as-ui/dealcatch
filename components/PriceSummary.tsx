import { Badge } from "@/components/Badge";
import { formatAgo, formatKRW, formatKstDate, formatKstDateTime, formatSignedPct } from "@/lib/format";
import { healthBadge, insufficientText, sourceBadge } from "@/lib/pricing/labels";
import type { LowPoint, PriceStats, WindowStat } from "@/lib/pricing/types";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{title}</div>
      {children}
    </div>
  );
}

function LowValue({ low }: { low: LowPoint }) {
  return (
    <>
      <div className="text-xl font-semibold tabular-nums">{formatKRW(low.price)}</div>
      <div className="text-xs text-zinc-600 dark:text-zinc-400">{formatKstDate(low.at)}</div>
      {low.currentVsLowPct !== null && (
        <div className="text-xs text-zinc-700 dark:text-zinc-300">
          {low.currentVsLowPct === 0 ? "현재가와 동일" : `현재가 ${formatSignedPct(low.currentVsLowPct)}`}
        </div>
      )}
    </>
  );
}

function WindowCard({ w, stats }: { w: WindowStat; stats: PriceStats }) {
  return (
    <Card title={`${w.days}일 최저가`}>
      {w.kind === "ok" ? (
        <LowValue low={w.low} />
      ) : (
        <>
          <div className="text-base font-semibold text-zinc-500 dark:text-zinc-400">데이터 부족</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">{insufficientText(w, stats)}</div>
        </>
      )}
    </Card>
  );
}

export function PriceSummary({ stats, now, variantLabel }: { stats: PriceStats; now: Date; variantLabel: string }) {
  const { current } = stats;
  return (
    <section aria-label="가격 요약" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">가격 요약 · {variantLabel}</h2>
        <Badge label={healthBadge(stats, now)} />
        {current && <Badge label={sourceBadge(current.source)} />}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="현재가">
          {current ? (
            <>
              <div className="text-xl font-semibold tabular-nums">{formatKRW(current.salePrice)}</div>
              {current.listPrice !== null && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  정가 {formatKRW(current.listPrice)}
                  {current.discountRatePct !== null && ` (${formatSignedPct(-current.discountRatePct)})`}
                </div>
              )}
              {current.stockStatus === "sold_out" && (
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">품절</div>
              )}
              {stats.health !== "ok" && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {formatKstDateTime(current.collectedAt)} 기준
                </div>
              )}
            </>
          ) : (
            <div className="text-base font-semibold text-zinc-500">기록 없음</div>
          )}
        </Card>
        <Card title="수집 기간 최저가">
          {stats.periodLow ? (
            <LowValue low={stats.periodLow} />
          ) : (
            <div className="text-base font-semibold text-zinc-500">기록 없음</div>
          )}
        </Card>
        <WindowCard w={stats.window30} stats={stats} />
        <WindowCard w={stats.window90} stats={stats} />
      </div>

      {stats.firstCollectedAt && stats.lastCollectedAt && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          수집 기간 {formatKstDate(stats.firstCollectedAt)} ~ {formatKstDate(stats.lastCollectedAt)} · 기록{" "}
          {stats.recordCount.toLocaleString("ko-KR")}건 · {stats.collectedDays}일 · 마지막 성공{" "}
          {stats.lastSuccessAt ? formatAgo(stats.lastSuccessAt, now) : "—"}
        </p>
      )}
    </section>
  );
}
