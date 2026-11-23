// 상품 목록 화면의 필터·정렬·요약 숫자 (순수 함수). 수집한 값만 쓰며 새 값을 만들지 않는다.

import { recentNewLow, type AlertVariant } from "@/lib/pricing/alerts";
import { isNearLow, type ProductSummary } from "@/lib/pricing/summary";

export interface FilterableProduct {
  id: number;
  name: string;
  brandName: string;
  category: string | null;
  isSample: boolean;
  summary: ProductSummary;
  alertVariants: AlertVariant[];
}

export type ListView = "all" | "near" | "recent";

export interface ListFilter {
  view: ListView;
  brand: string | null;
  category: string | null;
}

export const NO_CATEGORY = "미분류";

export function categoryOf(p: Pick<FilterableProduct, "category">): string {
  return p.category?.trim() || NO_CATEGORY;
}

/** URL 검색 파라미터 → 필터. 알 수 없는 값은 기본값으로 */
export function parseListFilter(params: Record<string, string | string[] | undefined>): ListFilter {
  const one = (k: string) => {
    const v = params[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s : null;
  };
  const view = one("view");
  return {
    view: view === "near" || view === "recent" ? view : "all",
    brand: one("brand"),
    category: one("cat"),
  };
}

const lastSuccess = (p: FilterableProduct) => p.summary.lastSuccessAt?.getTime() ?? -Infinity;

/**
 * 필터 적용 후 정렬.
 * - all / near: 수집 기간 최저가에 가까운 순 (비교 불가는 뒤로)
 * - recent: 최근에 확인(성공 기록)한 순
 */
export function applyListFilter<T extends FilterableProduct>(items: readonly T[], f: ListFilter): T[] {
  const out = items.filter(
    (p) =>
      (f.view !== "near" || isNearLow(p.summary)) &&
      (!f.brand || p.brandName === f.brand) &&
      (!f.category || categoryOf(p) === f.category),
  );
  if (f.view === "recent") out.sort((a, b) => lastSuccess(b) - lastSuccess(a));
  else out.sort((a, b) => (a.summary.nearestLowPct ?? Infinity) - (b.summary.nearestLowPct ?? Infinity));
  return out;
}

export interface ListStats {
  total: number;
  /** 현재가가 수집 기간 최저가와 같은 상품 */
  atLow: number;
  /** 최근 NEW_LOW_DAYS 일 안에 수집 기간 최저가를 갱신한 상품 */
  recentNewLow: number;
  /** 오래된 데이터 또는 수집 실패 */
  needsUpdate: number;
}

export function listStats(items: readonly FilterableProduct[], now: Date): ListStats {
  return {
    total: items.length,
    atLow: items.filter((p) => p.summary.nearestLowPct === 0).length,
    recentNewLow: items.filter(
      (p) => recentNewLow({ productId: p.id, name: p.name, isSample: p.isSample, targetPrice: null, variants: p.alertVariants }, now) !== null,
    ).length,
    needsUpdate: items.filter((p) => p.summary.health === "stale" || p.summary.health === "failing").length,
  };
}

/** 선택지 목록 (가나다순) */
export function distinctSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ko"));
}
