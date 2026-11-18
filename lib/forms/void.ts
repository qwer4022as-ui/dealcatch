// 가격 기록 무효 처리 사유 검증 (순수 함수).
// 기록은 삭제하지 않고 무효로 표시만 한다 (docs/database.md §3.7). 되돌릴 수 없다.

export type VoidReasonResult = { ok: true; reason: string } | { ok: false; error: string };

export function validateVoidReason(raw: string): VoidReasonResult {
  const reason = raw.replace(/\s+/g, " ").trim();
  if (reason.length < 2) return { ok: false, error: "무효 처리 사유를 2자 이상 입력해 주세요." };
  if (reason.length > 200) return { ok: false, error: "사유는 200자 이하로 입력해 주세요." };
  return { ok: true, reason };
}
