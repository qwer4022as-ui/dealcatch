// 가격 통계 계산 (순수 함수). DB·네트워크에 접근하지 않는다.
// 원칙: 수집하지 않은 가격을 만들거나 보간하지 않는다. 조건 미달이면 "데이터 부족"으로 돌려준다.
// docs/PRD.md §3, §4 F4

import { deriveHealth } from "./health";
import { kstDateKey, kstStartOfDay } from "./kst";
import {
  DEFAULT_PRICING_CONFIG,
  type CollectionAttempt,
  type CurrentPrice,
  type LowPoint,
  type PriceSnapshot,
  type PriceStats,
  type PricingConfig,
  type WindowStat,
} from "./types";

/** 소수 첫째 자리까지 반올림한 백분율 */
export function pct(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * 옵션 하나(listing_variant)의 가격 통계를 계산한다.
 *
 * @param snapshots 해당 옵션의 가격 기록 (순서 무관, 무효 포함 가능)
 * @param attempts  해당 리스팅의 수집 시도 (순서 무관)
 * @param now       기준 시각 (테스트에서 고정하기 위해 인자로 받는다)
 */
export function computePriceStats(
  snapshots: readonly PriceSnapshot[],
  attempts: readonly CollectionAttempt[],
  now: Date,
  config: PricingConfig = DEFAULT_PRICING_CONFIG,
): PriceStats {
  const valid = snapshots
    .filter((s) => !s.isVoid && s.collectedAt.getTime() <= now.getTime())
    .sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime());

  const latest = valid.at(-1) ?? null;
  const current: CurrentPrice | null = latest && {
    salePrice: latest.salePrice,
    listPrice: latest.listPrice,
    collectedAt: latest.collectedAt,
    source: latest.source,
    stockStatus: latest.stockStatus,
    discountRatePct:
      latest.listPrice != null && latest.listPrice > 0
        ? pct(latest.listPrice - latest.salePrice, latest.listPrice)
        : null,
  };

  // 최저가 후보: 무효 제외 + (설정 시) 품절 제외
  const eligible = config.excludeSoldOut
    ? valid.filter((s) => s.stockStatus !== "sold_out")
    : valid;

  const lowOf = (records: readonly PriceSnapshot[]): LowPoint | null => {
    let low: PriceSnapshot | null = null;
    for (const s of records) {
      // 같은 최저가가 여러 번이면 가장 최근 시각을 쓴다 (records는 시간 오름차순)
      if (low === null || s.salePrice <= low.salePrice) low = s;
    }
    if (!low) return null;
    return {
      price: low.salePrice,
      at: low.collectedAt,
      currentVsLowPct: current ? pct(current.salePrice - low.salePrice, low.salePrice) : null,
    };
  };

  const firstCollectedAt = valid[0]?.collectedAt ?? null;
  const collectedDayKeys = new Set(valid.map((s) => kstDateKey(s.collectedAt)));

  const windowStat = (days: number): WindowStat => {
    // 기간 = 오늘(KST)을 포함한 최근 `days`일
    const start = kstStartOfDay(now, days - 1);
    const startKey = kstDateKey(start);
    const inWindowDays = [...collectedDayKeys].filter((k) => k >= startKey).length;
    const coverage = Math.round((inWindowDays / days) * 1000) / 1000;
    const insufficient = (reason: "no_data" | "too_short" | "low_coverage"): WindowStat => ({
      kind: "insufficient",
      days,
      reason,
      collectedDays: inWindowDays,
      coverage,
    });

    if (!firstCollectedAt) return insufficient("no_data");
    if (firstCollectedAt.getTime() > start.getTime()) return insufficient("too_short");
    if (coverage < config.coverageThreshold) return insufficient("low_coverage");

    const low = lowOf(eligible.filter((s) => s.collectedAt.getTime() >= start.getTime()));
    if (!low) return insufficient("no_data");
    return { kind: "ok", days, low, coverage };
  };

  // 수집 상태
  const sortedAttempts = attempts
    .filter((a) => a.attemptedAt.getTime() <= now.getTime())
    .sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime());
  let consecutiveFailures = 0;
  for (const a of sortedAttempts) {
    if (a.outcome === "success") break;
    consecutiveFailures++;
  }
  const lastSuccessAttempt = sortedAttempts.find((a) => a.outcome === "success")?.attemptedAt;
  // 수동 입력 등 시도 기록 없이 들어온 기록도 성공으로 본다
  const lastSuccessAt =
    [lastSuccessAttempt, latest?.collectedAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const health = deriveHealth({
    consecutiveFailures,
    hasRecords: latest !== null,
    lastSuccessAt,
    now,
    staleAfterHours: config.staleAfterHours,
  });

  return {
    current,
    periodLow: lowOf(eligible),
    window30: windowStat(30),
    window90: windowStat(90),
    recordCount: valid.length,
    firstCollectedAt,
    lastCollectedAt: latest?.collectedAt ?? null,
    collectedDays: collectedDayKeys.size,
    health,
    consecutiveFailures,
    lastSuccessAt,
    hasSample: valid.some((s) => s.source === "sample"),
  };
}
