// 한국 표준시(KST, UTC+9) 날짜 계산. KST에는 일광절약시간이 없으므로 고정 오프셋을 쓴다.
// 저장은 UTC, "하루" 단위 집계는 KST 기준 (docs/PRD.md §5).

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 시각 → KST 날짜 키 "YYYY-MM-DD" */
export function kstDateKey(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 기준 시각이 속한 KST 날짜에서 `daysBack`일 전 KST 자정(00:00)의 실제 시각 */
export function kstStartOfDay(at: Date, daysBack = 0): Date {
  const kstMidnightAsUtc = Math.floor((at.getTime() + KST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(kstMidnightAsUtc - KST_OFFSET_MS - daysBack * DAY_MS);
}
