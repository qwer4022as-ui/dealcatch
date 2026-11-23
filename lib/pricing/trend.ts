// 대시보드 "오늘 확인할 상품"의 미니 그래프와 7일 변동률 (순수 함수).
// 원칙 P1: 기록이 없는 날은 null 로 두고 채우지 않는다. 비교할 7일 전 기록이 없으면 변동률을 내지 않는다.

import { kstDateKey, kstStartOfDay } from "./kst";
import { pct } from "./stats";

export const TREND_DAYS = 30;
export const CHANGE_DAYS = 7;

export interface TrendPoint {
  listingId: number;
  collectedAt: Date;
  salePrice: number;
  soldOut: boolean;
}

/**
 * 판매처별 최근 `days`일(KST, 오늘 포함)의 일별 최저 판매가.
 * 하루에 옵션·기록이 여러 개면 품절이 아닌 것 중 가장 싼 값. 기록이 없는 날은 null.
 */
export function dailyLowSeries(points: readonly TrendPoint[], now: Date, days = TREND_DAYS): Map<number, (number | null)[]> {
  const keys = Array.from({ length: days }, (_, i) => kstDateKey(kstStartOfDay(now, days - 1 - i)));
  const index = new Map(keys.map((k, i) => [k, i]));
  const out = new Map<number, (number | null)[]>();
  for (const p of points) {
    if (p.soldOut) continue;
    const i = index.get(kstDateKey(p.collectedAt));
    if (i === undefined) continue;
    let series = out.get(p.listingId);
    if (!series) out.set(p.listingId, (series = Array<number | null>(days).fill(null)));
    const prev = series[i];
    if (prev === null || p.salePrice < prev) series[i] = p.salePrice;
  }
  return out;
}

/**
 * 7일 변동률: 가장 최근 기록 값과, 그보다 `CHANGE_DAYS`일 이상 앞선 날 중 가장 가까운 기록 값을 비교한다.
 * 둘 중 하나라도 없으면 null (데이터 부족).
 */
export function changePct(series: readonly (number | null)[], days = CHANGE_DAYS): number | null {
  let last = -1;
  for (let i = series.length - 1; i >= 0; i--) if (series[i] !== null) { last = i; break; }
  if (last < 0) return null;
  for (let i = last - days; i >= 0; i--) {
    const base = series[i];
    if (base !== null) return pct((series[last] as number) - base, base);
  }
  return null;
}

/** 값이 있는 변동률의 평균 (소수 첫째 자리). 없으면 null */
export function averagePct(values: readonly (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v !== null);
  if (xs.length === 0) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}
