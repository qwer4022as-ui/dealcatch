"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  { key: "30", label: "30일", days: 30 },
  { key: "90", label: "90일", days: 90 },
  { key: "all", label: "전체", days: null },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const p = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !p || p.sale === null) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="text-zinc-500 dark:text-zinc-400">{formatKstDateTime(new Date(p.t))} (KST)</div>
      <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">판매가 {formatKRW(p.sale)}</div>
      {p.list !== null && <div className="text-zinc-600 dark:text-zinc-300">정가 {formatKRW(p.list)}</div>}
      {p.soldOut && <div className="mt-1 text-zinc-600 dark:text-zinc-300">품절 (최저가 계산 제외)</div>}
      {p.source === "sample" && <div className="text-violet-700 dark:text-violet-300">샘플 데이터</div>}
    </div>
  );
}

export function PriceChart({ points, nowMs }: { points: ChartPoint[]; nowMs: number }) {
  const [range, setRange] = useState<RangeKey>("90");

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
  const realCount = data.filter((p) => p.sale !== null).length;

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800" aria-label="가격 변동 그래프">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">가격 변동</h2>
        <div className="flex gap-1" role="group" aria-label="기간 선택">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`rounded-md px-3 py-1 text-sm ring-1 ring-inset ${
                range === r.key
                  ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100"
                  : "text-zinc-700 ring-zinc-300 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
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
        <div className="h-72 w-full rounded-md" style={{ background: "var(--chart-surface)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
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
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                stroke="var(--chart-grid)"
                width={44}
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
              <Line
                name="판매가"
                dataKey="sale"
                stroke="var(--chart-sale)"
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) =>
                  props.payload?.soldOut && props.cx != null && props.cy != null ? (
                    <circle
                      key={`so-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="var(--chart-surface)"
                      stroke="var(--chart-soldout)"
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {hasGap && <li>ⓘ 선이 끊긴 구간은 가격을 수집하지 못한 기간입니다. 값을 추정해 채우지 않습니다.</li>}
        {data.some((p) => p.soldOut) && <li>○ 속이 빈 점은 품절 상태에서 기록된 가격입니다 (최저가 계산 제외).</li>}
      </ul>
    </section>
  );
}
