// 규칙 기반 자동 요약 (순수 함수). AI 가 아니라 계산된 통계로 정해진 문장을 만든다.
// - 문장의 모든 숫자는 PriceStats 에서 그대로 온다 (새 숫자를 만들지 않는다)
// - 데이터가 부족하면 판단을 보류한다 (PRD 원칙 P1, P3, P6)
// 나중에 다른 방식(예: LLM)으로 바꿀 수 있도록 결과 형태(Narrative)를 고정한다.

import { formatAgo, formatKRW, formatSignedPct } from "@/lib/format";
import { kstDateKey } from "./kst";
import { NEAR_LOW_PCT } from "./summary";
import type { PriceStats, WindowStat } from "./types";

export interface Narrative {
  /** 생성 방식. 화면에 "규칙 기반"으로 표시한다 */
  method: "rule";
  sentences: string[];
  /** 근거 데이터 범위 */
  basis: string | null;
}

/** "10월 31일" (KST) */
function monthDay(at: Date): string {
  const [, m, d] = kstDateKey(at).split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

function windowSentence(w: WindowStat, collectedDays: number): string | null {
  if (w.kind === "ok") return null; // 최저가 값은 묶어서 따로 설명
  switch (w.reason) {
    case "too_short":
      return `수집 기간이 ${collectedDays}일이라 ${w.days}일 기준 판단은 아직 이릅니다.`;
    case "low_coverage":
      return `최근 ${w.days}일 중 ${w.collectedDays}일만 기록되어 ${w.days}일 기준 판단은 보류합니다.`;
    case "no_data":
      return null;
  }
}

export function buildNarrative(stats: PriceStats, now: Date): Narrative {
  const { current, periodLow } = stats;
  if (!current || !periodLow) {
    return { method: "rule", sentences: ["아직 가격 기록이 없어 요약할 수 없습니다."], basis: null };
  }

  const s: string[] = [];
  const soldOut = current.stockStatus === "sold_out" ? " (현재 품절)" : "";
  const pct = periodLow.currentVsLowPct ?? 0;

  // 1. 현재가 vs 수집 기간 최저가
  if (pct === 0) {
    s.push(`현재가 ${formatKRW(current.salePrice)}${soldOut}은 수집 기간 최저가와 같습니다.`);
  } else {
    s.push(
      `현재가 ${formatKRW(current.salePrice)}${soldOut}은 수집 기간 최저가(${formatKRW(periodLow.price)}, ${monthDay(periodLow.at)})보다 ${formatSignedPct(pct)} ${pct > 0 ? "높습니다" : "낮습니다"}.`,
    );
  }

  // 2. 30·90일 최저가 (같은 값이면 묶는다)
  const w30 = stats.window30;
  const w90 = stats.window90;
  if (w30.kind === "ok" && w90.kind === "ok" && w30.low.price === w90.low.price) {
    s.push(`최근 30일·90일 최저가는 모두 ${formatKRW(w30.low.price)}입니다.`);
  } else {
    for (const w of [w30, w90]) {
      if (w.kind === "ok") s.push(`최근 ${w.days}일 최저가는 ${formatKRW(w.low.price)}입니다.`);
    }
  }
  for (const w of [w30, w90]) {
    const line = windowSentence(w, stats.collectedDays);
    if (line) s.push(line);
  }

  // 3. 판단 (수집한 기록 기준임을 명시)
  if (stats.recordCount < 2) {
    s.push("기록이 1건뿐이라 가격 수준은 아직 판단할 수 없습니다.");
  } else if (pct <= 0) {
    s.push("수집한 기록 중에서는 지금이 가장 낮은 가격입니다.");
  } else if (pct <= NEAR_LOW_PCT) {
    s.push(`수집 기간 최저가에 가까운 가격입니다 (+${NEAR_LOW_PCT}% 이내).`);
  } else {
    s.push("수집한 기록 기준으로 지금은 최저가 수준이 아닙니다.");
  }

  // 4. 정가 대비
  if (current.discountRatePct !== null && current.discountRatePct > 0) {
    s.push(`정가 대비 할인율은 ${current.discountRatePct.toFixed(1)}%입니다.`);
  }

  // 5. 데이터 신선도
  if ((stats.health === "stale" || stats.health === "failing") && stats.lastSuccessAt) {
    s.push(`마지막 기록이 ${formatAgo(stats.lastSuccessAt, now)}이라 지금 가격과 다를 수 있습니다.`);
  }

  const range =
    stats.firstCollectedAt && stats.lastCollectedAt
      ? `${monthDay(stats.firstCollectedAt)} ~ ${monthDay(stats.lastCollectedAt)}`
      : "";
  const basis = `기록 ${stats.recordCount.toLocaleString("ko-KR")}건 · ${stats.collectedDays}일${range ? ` (${range})` : ""}${stats.hasSample ? " · 샘플 데이터" : ""}`;
  return { method: "rule", sentences: s, basis };
}
