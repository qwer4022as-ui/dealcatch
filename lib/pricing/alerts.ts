// 가격 알림 판정 (순수 함수). 수집한 기록만으로 판단하며 가격을 추정하지 않는다.
// 1) 목표가 도달: 판매 중인 옵션의 현재가 ≤ 목표가
// 2) 최저가 갱신: 최근 NEW_LOW_DAYS 일 안에 수집 기간 최저가에 처음 도달했고, 그보다 앞선 기록이 있음

const DAY_MS = 24 * 60 * 60 * 1000;
export const NEW_LOW_DAYS = 7;

export interface AlertVariant {
  label: string;
  latestPrice: number | null;
  latestStock: string | null;
  /** 무효·품절 제외 수집 기간 최저가 */
  lowPrice: number | null;
  /** 그 최저가에 처음 도달한 시각 */
  lowFirstAt: Date | null;
  firstCollectedAt: Date | null;
}

export interface AlertProduct {
  productId: number;
  name: string;
  isSample: boolean;
  targetPrice: number | null;
  variants: AlertVariant[];
}

export interface TargetHit {
  productId: number;
  name: string;
  label: string;
  price: number;
  target: number;
}

export interface NewLow {
  productId: number;
  name: string;
  label: string;
  price: number;
  at: Date;
}

/** 목표가 도달 옵션 중 가장 싼 것. 없으면 null */
export function targetHit(p: AlertProduct): TargetHit | null {
  if (p.targetPrice === null) return null;
  let best: TargetHit | null = null;
  for (const v of p.variants) {
    if (v.latestPrice === null || v.latestStock === "sold_out" || v.latestPrice > p.targetPrice) continue;
    if (!best || v.latestPrice < best.price) {
      best = { productId: p.productId, name: p.name, label: v.label, price: v.latestPrice, target: p.targetPrice };
    }
  }
  return best;
}

/** 최근 최저가를 새로 기록한 옵션 중 가장 최근 것. 없으면 null */
export function recentNewLow(p: AlertProduct, now: Date): NewLow | null {
  let best: NewLow | null = null;
  for (const v of p.variants) {
    const at = v.lowFirstAt;
    if (v.lowPrice === null || !at || !v.firstCollectedAt) continue;
    if (v.firstCollectedAt.getTime() >= at.getTime()) continue; // 첫 기록부터 그 값이면 "갱신"이 아님
    const age = now.getTime() - at.getTime();
    if (age < 0 || age > NEW_LOW_DAYS * DAY_MS) continue;
    if (!best || at > best.at) best = { productId: p.productId, name: p.name, label: v.label, price: v.lowPrice, at };
  }
  return best;
}

/** 샘플 상품은 제외 */
export function evaluateAlerts(products: readonly AlertProduct[], now: Date): { targetHits: TargetHit[]; newLows: NewLow[] } {
  const real = products.filter((p) => !p.isSample);
  return {
    targetHits: real
      .map(targetHit)
      .filter((x): x is TargetHit => x !== null)
      .sort((a, b) => a.price / a.target - b.price / b.target),
    newLows: real
      .map((p) => recentNewLow(p, now))
      .filter((x): x is NewLow => x !== null)
      .sort((a, b) => b.at.getTime() - a.at.getTime()),
  };
}
