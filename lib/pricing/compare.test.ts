import { describe, expect, it } from "vitest";
import { compareListings, type CompareRow } from "./compare";
import { summarizeProduct } from "./summary";

const NOW = new Date("2026-11-18T03:00:00Z");
const row = (listingId: number, current: number | null, low: number | null): CompareRow => ({
  listingId,
  label: `무신사 · ${listingId}`,
  url: `https://www.musinsa.com/products/${listingId}`,
  summary: summarizeProduct(
    current === null
      ? []
      : [{ label: "M", latestPrice: current, latestStock: "in_stock", lowPrice: low, lowAt: NOW, recordCount: 1, hasSample: false }],
    [{ failuresSinceSuccess: 0, lastSuccessAt: NOW, lastAttemptAt: NOW, hasRecords: current !== null }],
    NOW,
  ),
});

describe("compareListings", () => {
  it("현재가 낮은 순, 기록 없는 판매처는 뒤, 가장 저렴한 판매처 표시 (동률은 모두)", () => {
    const r = compareListings([row(1, 89000, 84900), row(2, null, null), row(3, 84900, 84900), row(4, 84900, 79000)]);
    expect(r.map((x) => [x.listingId, x.cheapest])).toEqual([
      [3, true],
      [4, true],
      [1, false],
      [2, false],
    ]);
  });

  it("가격이 있는 판매처가 1개뿐이면 '가장 저렴' 표시 안 함", () => {
    expect(compareListings([row(1, 89000, 84900), row(2, null, null)]).some((x) => x.cheapest)).toBe(false);
  });
});
