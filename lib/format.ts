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
