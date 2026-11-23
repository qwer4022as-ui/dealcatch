import type { Narrative } from "@/lib/pricing/narrative";

/**
 * 자동 요약 카드. 가격 수치(위 요약 카드·그래프)와 시각적으로 분리하고,
 * AI 가 아닌 규칙 기반 문장임을 표시한다 (PRD 원칙 P3).
 */
export function NarrativeCard({ narrative }: { narrative: Narrative }) {
  return (
    <section aria-label="자동 요약" className="card flex h-full flex-col gap-4 p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="currentColor" aria-hidden>
            <path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8zM18 13l.9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9z" />
          </svg>
          자동 요약
        </h2>
        <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs text-accent ring-1 ring-inset ring-accent/50">
          규칙 기반 · AI 아님
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {narrative.sentences.map((s) => (
          <li key={s} className="flex gap-2.5 leading-relaxed text-zinc-100">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" strokeLinejoin="round" />
        </svg>
        <p>
          {narrative.basis && (
            <>
              근거: {narrative.basis}
              <br />
            </>
          )}
          수집한 기록의 통계로 정해진 규칙에 따라 만든 문장입니다. 가격 수치는 위 요약이 원본입니다.
        </p>
      </div>
    </section>
  );
}
