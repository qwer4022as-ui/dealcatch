import { describe, expect, it } from "vitest";
import { isNearLow, summarizeProduct, type ListingHealthInput, type VariantSummaryInput } from "./summary";
import { worstHealth } from "./health";

const NOW = new Date("2026-11-18T03:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);

const variant = (over: Partial<VariantSummaryInput> = {}): VariantSummaryInput => ({
  label: "A · 블랙 / M",
  latestPrice: 129000,
  latestStock: "in_stock",
  lowPrice: 119000,
  lowAt: hoursAgo(24 * 18),
  recordCount: 100,
  hasSample: true,
  ...over,
});
const listing = (over: Partial<ListingHealthInput> = {}): ListingHealthInput => ({
  failuresSinceSuccess: 0,
  lastSuccessAt: hoursAgo(3),
  lastAttemptAt: hoursAgo(3),
  hasRecords: true,
  ...over,
});

describe("summarizeProduct", () => {
  it("옵션별 추가금 → 현재가 범위, 최저가는 옵션 중 최소", () => {
    const s = summarizeProduct(
      [variant({ latestPrice: 123760 }), variant({ latestPrice: 134000, lowPrice: 124000 })],
      [listing()],
      NOW,
    );
    expect(s.currentMin).toBe(123760);
    expect(s.currentMax).toBe(134000);
    expect(s.periodLow?.price).toBe(119000);
    expect(s.nearestLowPct).toBe(4);
    expect(isNearLow(s)).toBe(true);
    expect(s.health).toBe("ok");
    expect(s.recordCount).toBe(200);
  });

  it("근접 판정은 옵션 단위: 다른 플랫폼 옵션이 자기 최저가면 그 옵션을 함께 반환", () => {
    const s = summarizeProduct(
      [
        variant({ label: "A · 블랙 / M", latestPrice: 129000, lowPrice: 119000 }),
        variant({ label: "B · 블랙 / M", latestPrice: 135000, lowPrice: 135000 }),
      ],
      [listing()],
      NOW,
    );
    expect(s.periodLow?.price).toBe(119000);
    expect(s.nearestLowPct).toBe(0);
    expect(s.nearest).toEqual({ label: "B · 블랙 / M", current: 135000, low: 135000 });
  });

  it("최저가 대비 5% 초과면 근접 아님", () => {
    const s = summarizeProduct([variant({ latestPrice: 129000, lowPrice: 119000 })], [listing()], NOW);
    expect(s.nearestLowPct).toBe(8.4);
    expect(isNearLow(s)).toBe(false);
  });

  it("품절 옵션은 최저가 근접 계산에서 제외", () => {
    const s = summarizeProduct(
      [variant({ latestPrice: 119000, latestStock: "sold_out" }), variant({ latestPrice: 140000 })],
      [listing()],
      NOW,
    );
    expect(s.nearestLowPct).toBe(17.6);
  });

  it("리스팅 하나라도 실패 중이면 수집 실패, 연속 실패는 최댓값", () => {
    const s = summarizeProduct(
      [variant()],
      [listing(), listing({ failuresSinceSuccess: 3, lastSuccessAt: hoursAgo(40) })],
      NOW,
    );
    expect(s.health).toBe("failing");
    expect(s.consecutiveFailures).toBe(3);
  });

  it("마지막 성공이 24시간 넘으면 오래됨", () => {
    const s = summarizeProduct([variant()], [listing({ lastSuccessAt: hoursAgo(63) })], NOW);
    expect(s.health).toBe("stale");
  });

  it("기록·리스팅 없음 → 값 없음, no_data", () => {
    const s = summarizeProduct([], [], NOW);
    expect(s.currentMin).toBeNull();
    expect(s.periodLow).toBeNull();
    expect(s.nearestLowPct).toBeNull();
    expect(s.health).toBe("no_data");
    expect(isNearLow(s)).toBe(false);
  });
});

describe("worstHealth", () => {
  it("failing > stale > no_data > ok", () => {
    expect(worstHealth(["ok", "stale", "no_data"])).toBe("stale");
    expect(worstHealth(["ok", "failing", "stale"])).toBe("failing");
    expect(worstHealth([])).toBe("ok");
  });
});
