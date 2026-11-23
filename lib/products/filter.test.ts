import { describe, expect, it } from "vitest";
import type { ProductSummary } from "@/lib/pricing/summary";
import { applyListFilter, categoryOf, listStats, parseListFilter, type FilterableProduct } from "./filter";

const NOW = new Date("2026-11-23T03:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function summary(over: Partial<ProductSummary> = {}): ProductSummary {
  return {
    variantCount: 1,
    currentMin: 10000,
    currentMax: 10000,
    periodLow: null,
    nearestLowPct: null,
    nearest: null,
    health: "ok",
    consecutiveFailures: 0,
    lastSuccessAt: null,
    lastAttemptAt: null,
    recordCount: 1,
    hasSample: false,
    ...over,
  };
}

function product(id: number, over: Partial<FilterableProduct> = {}): FilterableProduct {
  return { id, name: `상품${id}`, brandName: "A", category: null, isSample: false, summary: summary(), alertVariants: [], ...over };
}

describe("parseListFilter", () => {
  it("알 수 없는 view 는 all, 빈 값은 null", () => {
    expect(parseListFilter({ view: "x", brand: " ", cat: undefined })).toEqual({ view: "all", brand: null, category: null });
  });
  it("배열이면 첫 값", () => {
    expect(parseListFilter({ view: ["near", "recent"], brand: ["B"], cat: "상의" })).toEqual({ view: "near", brand: "B", category: "상의" });
  });
});

describe("applyListFilter", () => {
  const items = [
    product(1, { summary: summary({ nearestLowPct: 8, lastSuccessAt: new Date(NOW.getTime() - 1 * DAY) }) }),
    product(2, { brandName: "B", category: "아우터", summary: summary({ nearestLowPct: 0, lastSuccessAt: new Date(NOW.getTime() - 5 * DAY) }) }),
    product(3, { summary: summary({ nearestLowPct: null }) }),
  ];

  it("기본: 최저가에 가까운 순, 비교 불가는 뒤로", () => {
    expect(applyListFilter(items, { view: "all", brand: null, category: null }).map((p) => p.id)).toEqual([2, 1, 3]);
  });
  it("최저가 임박: +5% 이내만", () => {
    expect(applyListFilter(items, { view: "near", brand: null, category: null }).map((p) => p.id)).toEqual([2]);
  });
  it("최근 확인순: 기록 없는 상품은 뒤로", () => {
    expect(applyListFilter(items, { view: "recent", brand: null, category: null }).map((p) => p.id)).toEqual([1, 2, 3]);
  });
  it("브랜드·카테고리(미분류 포함) 필터", () => {
    expect(applyListFilter(items, { view: "all", brand: "B", category: null }).map((p) => p.id)).toEqual([2]);
    expect(applyListFilter(items, { view: "all", brand: null, category: "미분류" }).map((p) => p.id)).toEqual([1, 3]);
  });
  it("원본 배열을 바꾸지 않는다", () => {
    applyListFilter(items, { view: "recent", brand: null, category: null });
    expect(items.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe("listStats", () => {
  it("최저가 동일·최근 갱신·갱신 필요를 센다", () => {
    const items = [
      product(1, { summary: summary({ nearestLowPct: 0, health: "stale" }) }),
      product(2, {
        summary: summary({ health: "failing" }),
        alertVariants: [
          {
            label: "L",
            latestPrice: 9000,
            latestStock: "in_stock",
            lowPrice: 9000,
            lowFirstAt: new Date(NOW.getTime() - 2 * DAY),
            firstCollectedAt: new Date(NOW.getTime() - 20 * DAY),
          },
        ],
      }),
      product(3),
    ];
    expect(listStats(items, NOW)).toEqual({ total: 3, atLow: 1, recentNewLow: 1, needsUpdate: 2 });
  });
});

describe("categoryOf", () => {
  it("비어 있으면 미분류", () => {
    expect(categoryOf({ category: "  " })).toBe("미분류");
    expect(categoryOf({ category: "상의" })).toBe("상의");
  });
});
