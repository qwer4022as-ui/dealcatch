import type { ReactNode } from "react";

export type StatTone = "violet" | "green" | "amber";

const TONE: Record<StatTone, { card: string; icon: string }> = {
  violet: { card: "border-accent/35 bg-accent/[0.07]", icon: "text-accent" },
  green: { card: "border-zinc-700 bg-zinc-900/60", icon: "text-emerald-400" },
  amber: { card: "border-zinc-700 bg-zinc-900/60", icon: "text-amber-400" },
};

/** 아이콘 + 라벨 + 큰 숫자 카드. 오른쪽에 같은 아이콘을 흐리게 깔아 장식한다 */
export function StatCard({ icon, label, value, unit = "개", note, tone = "violet" }: {
  icon: ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  note?: string;
  tone?: StatTone;
}) {
  const t = TONE[tone];
  return (
    <div className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border px-5 py-4 ${t.card}`}>
      <span className={`h-9 w-9 shrink-0 ${t.icon}`}>{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="text-2xl font-extrabold tabular-nums text-zinc-50">
          {value}
          {unit && <span className="ml-0.5 text-base font-bold">{unit}</span>}
        </span>
        {note && <span className="text-xs text-zinc-500">{note}</span>}
      </div>
      <span aria-hidden className={`pointer-events-none absolute -right-2 top-1/2 h-20 w-20 -translate-y-1/2 opacity-[0.08] ${t.icon}`}>
        {icon}
      </span>
    </div>
  );
}

const svg = (d: string, extra?: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
    {extra}
  </svg>
);

export const StatIcons = {
  hanger: svg("M10 6.2a2 2 0 1 1 3 1.7L12 8.6v1.6M12 10.2 2.8 16.4a1 1 0 0 0 .6 1.8h17.2a1 1 0 0 0 .6-1.8L12 10.2Z"),
  tag: svg("M3 12.6V4.4A1.4 1.4 0 0 1 4.4 3h8.2l8.4 8.4a1.4 1.4 0 0 1 0 2l-7.6 7.6a1.4 1.4 0 0 1-2 0z", <circle cx="7.6" cy="7.6" r="1.4" />),
  trendDown: svg("M3 7l6 6 4-4 8 8M21 11v6h-6"),
  refresh: svg("M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"),
};
