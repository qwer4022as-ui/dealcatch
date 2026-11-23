import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { formatAgo, formatKRW, formatKstDate, formatKstDateTime, formatSignedPct } from "@/lib/format";
import { healthBadge, insufficientText, sourceBadge } from "@/lib/pricing/labels";
import type { LowPoint, PriceStats, WindowStat } from "@/lib/pricing/types";

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const ICONS = {
  tag: icon(
    <>
      <path d="M3 12.6V4.4A1.4 1.4 0 0 1 4.4 3h8.2l8.4 8.4a1.4 1.4 0 0 1 0 2l-7.6 7.6a1.4 1.4 0 0 1-2 0z" />
      <circle cx="7.6" cy="7.6" r="1.4" />
    </>,
  ),
  crown: icon(<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />),
  calendar: icon(
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>,
  ),
  trend: icon(<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />),
};

function Card({ title, icon, highlight, children }: { title: string; icon: ReactNode; highlight?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-2xl border p-4 ${
        highlight
          ? "border-accent/60 bg-accent/[0.08] shadow-[0_0_32px_-12px_rgb(185_164_255/0.5)]"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-1.5 whitespace-nowrap text-sm text-zinc-300">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

const big = "whitespace-nowrap text-2xl font-extrabold tabular-nums text-zinc-50";
const sub = "text-xs text-zinc-400";

function LowValue({ low }: { low: LowPoint }) {
  return (
    <>
      <div className={big}>{formatKRW(low.price)}</div>
      <div className={sub}>
        {formatKstDate(low.at)}
        {low.currentVsLowPct !== null && (
          <> · {low.currentVsLowPct === 0 ? "현재가와 동일" : `현재가 ${formatSignedPct(low.currentVsLowPct)}`}</>
        )}
      </div>
    </>
  );
}

function WindowCard({ w, stats }: { w: WindowStat; stats: PriceStats }) {
  return (
    <Card title={`${w.days}일 최저가`} icon={ICONS.calendar}>
      {w.kind === "ok" ? (
        <LowValue low={w.low} />
      ) : (
        <>
          <div className="text-xl font-bold text-zinc-200">데이터 부족</div>
          <div className={sub}>{insufficientText(w, stats)}</div>
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
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="currentColor" aria-hidden>
            <rect x="4" y="11" width="3" height="9" rx="1" />
            <rect x="10.5" y="5" width="3" height="15" rx="1" />
            <rect x="17" y="8" width="3" height="12" rx="1" />
          </svg>
          가격 요약 <span className="font-medium text-zinc-300">· {variantLabel}</span>
        </h2>
        <Badge label={healthBadge(stats, now)} />
        {current && <Badge label={sourceBadge(current.source)} />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="현재가" icon={ICONS.tag} highlight>
          {current ? (
            <>
              <div className={big}>{formatKRW(current.salePrice)}</div>
              {current.listPrice !== null && (
                <div className={sub}>
                  정가 {formatKRW(current.listPrice)}
                  {current.discountRatePct !== null && (
                    <span className="text-emerald-400"> ({formatSignedPct(-current.discountRatePct)})</span>
                  )}
                </div>
              )}
              {current.stockStatus === "sold_out" && <div className="text-xs font-medium text-zinc-200">품절</div>}
              {stats.health !== "ok" && <div className={sub}>{formatKstDateTime(current.collectedAt)} 기준</div>}
            </>
          ) : (
            <div className="text-xl font-bold text-zinc-400">기록 없음</div>
          )}
        </Card>
        <Card title="수집 기간 최저가" icon={ICONS.crown}>
          {stats.periodLow ? <LowValue low={stats.periodLow} /> : <div className="text-xl font-bold text-zinc-400">기록 없음</div>}
        </Card>
        <WindowCard w={stats.window30} stats={stats} />
        <WindowCard w={stats.window90} stats={stats} />
        <Card title="정가 대비 할인율" icon={ICONS.trend}>
          {current?.discountRatePct != null && current.listPrice !== null ? (
            <>
              {current.discountRatePct > 0 ? (
                <div className="whitespace-nowrap text-2xl font-extrabold tabular-nums text-emerald-400">
                  <span aria-hidden>↓ </span>
                  {current.discountRatePct.toFixed(1)}%
                </div>
              ) : (
                <div className="text-xl font-bold text-zinc-200">할인 없음</div>
              )}
              <div className={sub}>정가 {formatKRW(current.listPrice)} 기준</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-zinc-400">—</div>
              <div className={sub}>정가 기록 없음</div>
            </>
          )}
        </Card>
      </div>

      {stats.firstCollectedAt && stats.lastCollectedAt && (
        <p className="text-xs text-zinc-400">
          수집 기간 {formatKstDate(stats.firstCollectedAt)} ~ {formatKstDate(stats.lastCollectedAt)} · 기록{" "}
          {stats.recordCount.toLocaleString("ko-KR")}건 · {stats.collectedDays}일 · 마지막 성공{" "}
          {stats.lastSuccessAt ? formatAgo(stats.lastSuccessAt, now) : "—"}
        </p>
      )}
    </section>
  );
}
