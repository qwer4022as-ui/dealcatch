// "오늘 확인할 상품" 목록 (순수 함수).
// 자동 수집을 하지 않으므로(docs/platform-reviews/), 판매처(색상 페이지)마다 오늘(KST) 기록이 없는 것을 보여 준다.

import { kstDateKey } from "./kst";

export interface CheckTarget {
  listingId: number;
  productId: number;
  brandName: string;
  productName: string;
  modelNo: string | null;
  platformName: string;
  /** 판매처 옵션의 색상 (없으면 빈 문자열) */
  color: string;
  url: string;
  /** 판매처의 옵션(사이즈 등) 수 */
  variantCount: number;
  lastSuccessAt: Date | null;
}

export interface CheckList {
  /** 오늘 아직 기록하지 않은 판매처. 기록이 없는 것 → 오래된 것 순 */
  due: CheckTarget[];
  /** 오늘 이미 기록한 판매처 수 */
  doneToday: number;
}

export function buildCheckList(targets: readonly CheckTarget[], now: Date): CheckList {
  const today = kstDateKey(now);
  const due = targets.filter((t) => !t.lastSuccessAt || kstDateKey(t.lastSuccessAt) !== today);
  due.sort((a, b) => {
    if (!a.lastSuccessAt || !b.lastSuccessAt) return a.lastSuccessAt ? 1 : b.lastSuccessAt ? -1 : a.listingId - b.listingId;
    return a.lastSuccessAt.getTime() - b.lastSuccessAt.getTime();
  });
  return { due, doneToday: targets.length - due.length };
}
