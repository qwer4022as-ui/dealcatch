"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ChartPoint } from "@/lib/pricing/chart";
import { formatKRW, formatKstDateTime, formatKstMonthDay } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = [
  { key: "all", label: "전체", days: null },
  { key: "30", label: "30일", days: 30 },
  { key: "90", label: "90일", days: 90 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const p = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !p || p.sale === null) return null;
  return (
    <div className="rounded-xl border border-accent/40 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg shadow-black/40">
      <div className="text-zinc-500 dark:text-zinc-400">{formatKstDateTime(new Date(p.t))} (KST)</div>
      <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">판매가 {formatKRW(p.sale)}</div>
      {p.list !== null && <div className="text-zinc-600 dark:text-zinc-300">정가 {formatKRW(p.list)}</div>}
      {p.soldOut && <div className="mt-1 text-zinc-600 dark:text-zinc-300">품절 (최저가 계산 제외)</div>}
      {p.source === "sample" && <div className="text-violet-700 dark:text-violet-300">샘플 데이터</div>}
    </div>
  );
}

/** 최저가 지점 라벨 */
function LowLabel({ viewBox, value }: { viewBox?: { x?: number; y?: number }; value: string }) {
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;
  const w = value.length * 7.5 + 20;
  return (
    <g transform={`translate(${x - w + 8 < 80 ? x - 8 : x - w + 8} ${y - 40})`}>
      <rect width={w} height={26} rx={8} fill="var(--chart-surface)" stroke="var(--chart-sale)" strokeOpacity={0.6} />
      <text x={w / 2} y={17} textAnchor="middle" fontSize={12} fill="var(--foreground)">
        {value}
      </text>
    </g>
  );
}

export function PriceChart({ points, nowMs, embedded = false }: { points: ChartPoint[]; nowMs: number; embedded?: boolean }) {
  const [range, setRange] = useState<RangeKey>("all");

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    const from = days === null ? -Infinity : nowMs - days * DAY_MS;
    const filtered = points.filter((p) => p.t >= from);
    // 기간 경계에서 공백 표시 지점으로 시작·끝나지 않게 정리
    while (filtered[0]?.sale === null) filtered.shift();
    while (filtered.at(-1)?.sale === null) filtered.pop();
    return filtered;
  }, [points, range, nowMs]);

  const hasGap = data.some((p) => p.sale === null);
  // 표시 구간의 최저 판매가 (품절 제외, 가장 최근 지점에 라벨)
  const low = data.reduce<ChartPoint | null>(
    (m, p) => (p.sale !== null && !p.soldOut && (!m || p.sale <= (m.sale as number)) ? p : m),
    null,
  );
  const realCount = data.filter((p) => p.sale !== null).length;

  return (
    <section className={embedded ? "" : "card p-5"} aria-label="가격 변동 그래프">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
            </svg>
            가격 추이
          </h2>
          <span className="text-xs text-zinc-400">기간별 가격 변화를 그래프로 확인하세요.</span>
        </div>
        <div className="flex gap-1 rounded-xl bg-zinc-900 p-1 ring-1 ring-inset ring-zinc-800" role="group" aria-label="기간 선택">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`rounded-lg px-4 py-1 text-sm whitespace-nowrap ${
                range === r.key ? "bg-accent font-semibold text-zinc-950" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {realCount < 2 ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          {realCount === 0 ? "이 기간에 수집된 가격이 없습니다." : "그래프를 그리기에 기록이 부족합니다 (1건)."}
        </p>
      ) : (
        <div className="h-72 w-full rounded-xl" style={{ background: "var(--chart-surface)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 20, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id="sale-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--chart-sale)" stopOpacity={0.35} />
                  <stop offset="1" stopColor="var(--chart-sale)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => formatKstMonthDay(t)}
                tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                stroke="var(--chart-grid)"
                minTickGap={32}
              />
              <YAxis
                tickFormatter={(v: number) => formatKRW(v)}
                tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                stroke="var(--chart-grid)"
                width={72}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={ChartTooltip}
                cursor={{ stroke: "var(--chart-text)", strokeDasharray: "3 3" }}
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={28}
                wrapperStyle={{ fontSize: 12, color: "var(--chart-text)" }}
              />
              <Line
                name="정가"
                dataKey="list"
                stroke="var(--chart-list)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Area
                name="판매가"
                dataKey="sale"
                type="linear"
                stroke="var(--chart-sale)"
                strokeWidth={2.5}
                fill="url(#sale-fill)"
                dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) =>
                  props.cx != null && props.cy != null && props.payload?.sale != null ? (
                    <circle
                      key={`d-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={props.payload.soldOut ? 4 : 3}
                      fill={props.payload.soldOut ? "var(--chart-surface)" : "var(--chart-sale)"}
                      stroke={props.payload.soldOut ? "var(--chart-soldout)" : "var(--chart-surface)"}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <g key={`d-${props.index}`} />
                  )
                }
                activeDot={{ r: 5, stroke: "var(--chart-surface)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {low && (
                <ReferenceDot
                  x={low.t}
                  y={low.sale as number}
                  r={6}
                  fill="var(--chart-surface)"
                  stroke="var(--chart-sale)"
                  strokeWidth={3}
                  label={<LowLabel value={`최저가 ${formatKRW(low.sale as number)}`} />}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <ul className="mt-3 space-y-1 text-xs text-zinc-400">
        {hasGap && <li>ⓘ 선이 끊긴 구간은 가격을 수집하지 못한 기간입니다. 값을 추정해 채우지 않습니다.</li>}
        {data.some((p) => p.soldOut) && <li>○ 속이 빈 점은 품절 상태에서 기록된 가격입니다 (최저가 계산 제외).</li>}
      </ul>
    </section>
  );
}
