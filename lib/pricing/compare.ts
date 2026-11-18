// 판매처(색상 페이지)별 가격 비교 (순수 함수). docs/PRD.md F6
// 판매처마다 현재가·수집 기간 최저가가 따로 있으므로 같은 기준(summarizeProduct)으로 요약해 나란히 보여 준다.

import type { ProductSummary } from "./summary";

export interface CompareRow {
  listingId: number;
  /** 예: "무신사 · Black" */
  label: string;
  url: string;
  summary: ProductSummary;
}

export interface ComparedRow extends CompareRow {
  /** 현재가(옵션 중 최저)가 판매처들 중 가장 낮은지. 같은 값이면 모두 true */
  cheapest: boolean;
}

/** 현재가 낮은 순(현재가 없는 판매처는 뒤), 가장 저렴한 판매처 표시 */
export function compareListings(rows: readonly CompareRow[]): ComparedRow[] {
  const prices = rows.map((r) => r.summary.currentMin).filter((p): p is number => p !== null);
  const min = prices.length ? Math.min(...prices) : null;
  // 비교할 판매처가 2개 이상일 때만 "가장 저렴"이 의미가 있다
  const comparable = prices.length >= 2;
  return [...rows]
    .sort((a, b) => (a.summary.currentMin ?? Infinity) - (b.summary.currentMin ?? Infinity) || a.listingId - b.listingId)
    .map((r) => ({ ...r, cheapest: comparable && r.summary.currentMin !== null && r.summary.currentMin === min }));
}
