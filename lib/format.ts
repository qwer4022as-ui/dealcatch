/**
 * 원(KRW) 정수 금액을 "89,000원" 형식으로 표시한다.
 * 금액은 DB와 동일하게 정수만 받는다(부동소수점 금지 원칙).
 */
export function formatKRW(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`금액은 정수여야 합니다: ${amount}`);
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "2026-11-18 09:00" (KST) */
export function formatKstDateTime(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

/** "2026-11-18" (KST) */
export function formatKstDate(at: Date): string {
  return formatKstDateTime(at).slice(0, 10);
}

/** "11-18" (KST) — 그래프 축 */
export function formatKstMonthDay(at: Date | number): string {
  return formatKstDateTime(new Date(at)).slice(5, 10);
}

/** +8.4% / −3.0% / 0% */
export function formatSignedPct(value: number): string {
  if (value === 0) return "0%";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/** "방금 전" / "5분 전" / "3시간 전" / "2일 전" */
export function formatAgo(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
