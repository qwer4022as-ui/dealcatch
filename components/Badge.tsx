import type { BadgeLabel, Tone } from "@/lib/pricing/labels";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-950 dark:text-emerald-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-600/40 dark:bg-amber-950 dark:text-amber-200",
  error: "bg-red-50 text-red-800 ring-red-600/30 dark:bg-red-950 dark:text-red-200",
  muted: "bg-zinc-100 text-zinc-700 ring-zinc-500/30 dark:bg-zinc-800 dark:text-zinc-300",
  sample: "bg-violet-50 text-violet-800 ring-violet-600/30 dark:bg-violet-950 dark:text-violet-200",
  outline: "bg-transparent text-zinc-700 ring-zinc-400 dark:text-zinc-300",
};

const TONE_ICON: Partial<Record<Tone, string>> = { ok: "●", warn: "◐", error: "✕", sample: "◇" };

/** 상태는 색상만이 아니라 아이콘 + 텍스트로 구분한다 */
export function Badge({ label }: { label: BadgeLabel }) {
  const icon = TONE_ICON[label.tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[label.tone]}`}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label.text}
    </span>
  );
}
