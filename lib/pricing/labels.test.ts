import { describe, expect, it } from "vitest";
import { computePriceStats } from "./stats";
import { healthBadge, insufficientText } from "./labels";
import { makeHistory } from "./__fixtures__/history";

const NOW = new Date("2026-11-18T03:00:00Z");

describe("화면 문구", () => {
  it("수집 실패 배지에 연속 횟수", () => {
    const h = makeHistory({ now: NOW, days: 60, listPrice: 69000, basePrice: 49000, failLast: 3 });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);
    expect(healthBadge(s, NOW)).toEqual({ text: "수집 실패 (3회 연속)", tone: "error" });
  });

  it("오래된 데이터 배지에 경과 시간", () => {
    const h = makeHistory({ now: NOW, days: 40, listPrice: 89000, basePrice: 69000, stopDays: 3 });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);
    expect(healthBadge(s, NOW)).toEqual({ text: "2일 전 데이터", tone: "warn" });
  });

  it("데이터 부족 설명: 기간 짧음 / 커버리지 미달", () => {
    const knit = makeHistory({ now: NOW, days: 20, listPrice: 79000, basePrice: 59000 });
    const s1 = computePriceStats(knit.snapshots, knit.attempts, NOW);
    if (s1.window90.kind !== "insufficient") throw new Error();
    expect(insufficientText(s1.window90, s1)).toBe("21일 수집 (90일 필요)");

    const denim = makeHistory({
      now: NOW, days: 50, listPrice: 99000, basePrice: 79000, gap: { from: 34, to: 20 },
    });
    const s2 = computePriceStats(denim.snapshots, denim.attempts, NOW);
    if (s2.window30.kind !== "insufficient") throw new Error();
    expect(insufficientText(s2.window30, s2)).toBe("최근 30일 중 20일만 수집");
  });
});
