// 수집 상태 판정. 상세 화면(computePriceStats)과 목록 화면(summarizeProduct)이 같은 규칙을 쓴다.
// 우선순위: 수집 실패 > 기록 없음 > 오래됨 > 정상

import type { Health } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export function deriveHealth(input: {
  /** 마지막 성공 이후 연속 실패 횟수 */
  consecutiveFailures: number;
  /** 유효한 가격 기록이 있는지 */
  hasRecords: boolean;
  lastSuccessAt: Date | null;
  now: Date;
  staleAfterHours: number;
}): Health {
  if (input.consecutiveFailures > 0) return "failing";
  if (!input.hasRecords) return "no_data";
  if (input.lastSuccessAt && input.now.getTime() - input.lastSuccessAt.getTime() > input.staleAfterHours * HOUR_MS) {
    return "stale";
  }
  return "ok";
}

const SEVERITY: Record<Health, number> = { failing: 3, stale: 2, no_data: 1, ok: 0 };

/** 여러 리스팅 중 가장 심각한 상태 */
export function worstHealth(values: Health[]): Health {
  return values.reduce<Health>((worst, h) => (SEVERITY[h] > SEVERITY[worst] ? h : worst), "ok");
}
