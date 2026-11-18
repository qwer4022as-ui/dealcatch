// 테스트용 가격 이력 생성기. supabase/seed/sample.sql 의 seed_history 와 같은 규칙을 따른다.
// 매일 09:00, 21:00 (KST) 수집. 날짜는 기준 시각(now) 기준 "N일 전".

import type { CollectionAttempt, PriceSnapshot } from "../types";
import { kstStartOfDay } from "../kst";

const HOUR_MS = 60 * 60 * 1000;

export interface HistoryOptions {
  now: Date;
  days: number;
  listPrice: number;
  basePrice: number;
  /** { from: 며칠 전, to: 며칠 전 (포함), price } */
  discounts?: { from: number; to: number; price: number }[];
  stopDays?: number;
  gap?: { from: number; to: number };
  failLast?: number;
  soldOut?: { from: number; to: number };
  extra?: number;
}

export function makeHistory(o: HistoryOptions): {
  snapshots: PriceSnapshot[];
  attempts: CollectionAttempt[];
} {
  const slots: { at: Date; daysAgo: number }[] = [];
  for (let d = o.days; d >= (o.stopDays ?? 0); d--) {
    if (o.gap && d <= o.gap.from && d >= o.gap.to) continue;
    for (const h of [9, 21]) {
      const at = new Date(kstStartOfDay(o.now, d).getTime() + h * HOUR_MS);
      if (at.getTime() <= o.now.getTime()) slots.push({ at, daysAgo: d });
    }
  }

  const snapshots: PriceSnapshot[] = [];
  const attempts: CollectionAttempt[] = [];
  const failFrom = slots.length - (o.failLast ?? 0);
  slots.forEach(({ at, daysAgo }, i) => {
    if (i >= failFrom) {
      attempts.push({ attemptedAt: at, outcome: "parse_error" });
      return;
    }
    attempts.push({ attemptedAt: at, outcome: "success" });
    const discount = o.discounts?.find((x) => daysAgo <= x.from && daysAgo >= x.to);
    const extra = o.extra ?? 0;
    snapshots.push({
      collectedAt: at,
      salePrice: (discount?.price ?? o.basePrice) + extra,
      listPrice: o.listPrice + extra,
      stockStatus:
        o.soldOut && daysAgo <= o.soldOut.from && daysAgo >= o.soldOut.to ? "sold_out" : "in_stock",
      source: "sample",
      isVoid: false,
    });
  });
  return { snapshots, attempts };
}
