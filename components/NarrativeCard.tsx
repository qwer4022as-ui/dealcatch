import type { Narrative } from "@/lib/pricing/narrative";

/**
 * 자동 요약 카드. 가격 수치(위 요약 카드·그래프)와 시각적으로 분리하고,
 * AI 가 아닌 규칙 기반 문장임을 표시한다 (PRD 원칙 P3).
 */
export function NarrativeCard({ narrative }: { narrative: Narrative }) {
  return (
    <section
      aria-label="자동 요약"
      className="flex flex-col gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">자동 요약</h2>
        <span className="rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ring-zinc-400 dark:ring-zinc-600">
          규칙 기반 · AI 아님
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {narrative.sentences.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {narrative.basis && <>근거: {narrative.basis} · </>}
        수집한 기록의 통계로 정해진 규칙에 따라 만든 문장입니다. 가격 수치는 위 요약이 원본입니다.
      </p>
    </section>
  );
}
