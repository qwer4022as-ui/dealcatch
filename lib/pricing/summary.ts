// 목록·대시보드용 상품 요약 (순수 함수).
// 입력은 DB 요약 뷰(v_latest_price, v_variant_price_summary, v_listing_health) 값이다.

import { deriveHealth, worstHealth } from "./health";
import { pct } from "./stats";
import { DEFAULT_PRICING_CONFIG, type Health, type PricingConfig, type StockStatus } from "./types";

/** 현재가가 수집 기간 최저가보다 이 비율(%) 이하로 높으면 "최저가 근접" */
export const NEAR_LOW_PCT = 5;

export interface VariantSummaryInput {
  /** 화면 표시용 옵션 이름 (예: "샘플 플랫폼 B · 블랙 / M") */
  label: string;
  latestPrice: number | null;
  latestStock: StockStatus | null;
  /** 무효·품절 제외 최저가 */
  lowPrice: number | null;
  lowAt: Date | null;
  recordCount: number;
  hasSample: boolean;
}

export interface ListingHealthInput {
  failuresSinceSuccess: number;
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  /** 이 리스팅 옵션 중 유효 기록이 하나라도 있는지 */
  hasRecords: boolean;
}

export interface ProductSummary {
  variantCount: number;
  currentMin: number | null;
  currentMax: number | null;
  periodLow: { price: number; at: Date } | null;
  /** 판매 중인 옵션 중 (현재가 − 최저가) / 최저가 가 가장 작은 값(%) */
  nearestLowPct: number | null;
  /** nearestLowPct 를 만든 옵션. 옵션마다 최저가가 다르므로 화면에 함께 표시한다 */
  nearest: { label: string; current: number; low: number } | null;
  health: Health;
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  recordCount: number;
  hasSample: boolean;
}

const maxDate = (dates: (Date | null)[]): Date | null =>
  dates.reduce<Date | null>((m, d) => (d && (!m || d > m) ? d : m), null);

export function summarizeProduct(
  variants: readonly VariantSummaryInput[],
  listings: readonly ListingHealthInput[],
  now: Date,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
): ProductSummary {
  const prices = variants.map((v) => v.latestPrice).filter((p): p is number => p !== null);

  let periodLow: ProductSummary["periodLow"] = null;
  for (const v of variants) {
    if (v.lowPrice === null || v.lowAt === null) continue;
    if (!periodLow || v.lowPrice < periodLow.price || (v.lowPrice === periodLow.price && v.lowAt > periodLow.at)) {
      periodLow = { price: v.lowPrice, at: v.lowAt };
    }
  }

  let nearest: ProductSummary["nearest"] = null;
  let nearestLowPct: number | null = null;
  for (const v of variants) {
    if (v.latestPrice === null || v.lowPrice === null || v.latestStock === "sold_out") continue;
    const gap = pct(v.latestPrice - v.lowPrice, v.lowPrice);
    if (nearestLowPct === null || gap < nearestLowPct) {
      nearestLowPct = gap;
      nearest = { label: v.label, current: v.latestPrice, low: v.lowPrice };
    }
  }

  const health = worstHealth(
    listings.map((l) =>
      deriveHealth({
        consecutiveFailures: l.failuresSinceSuccess,
        hasRecords: l.hasRecords,
        lastSuccessAt: l.lastSuccessAt,
        now,
        staleAfterHours: config.staleAfterHours,
      }),
    ),
  );

  return {
    variantCount: variants.length,
    currentMin: prices.length ? Math.min(...prices) : null,
    currentMax: prices.length ? Math.max(...prices) : null,
    periodLow,
    nearestLowPct,
    nearest,
    health: listings.length === 0 ? "no_data" : health,
    consecutiveFailures: Math.max(0, ...listings.map((l) => l.failuresSinceSuccess)),
    lastSuccessAt: maxDate(listings.map((l) => l.lastSuccessAt)),
    lastAttemptAt: maxDate(listings.map((l) => l.lastAttemptAt)),
    recordCount: variants.reduce((n, v) => n + v.recordCount, 0),
    hasSample: variants.some((v) => v.hasSample),
  };
}

export function isNearLow(s: ProductSummary): boolean {
  return s.nearestLowPct !== null && s.nearestLowPct <= NEAR_LOW_PCT;
}
