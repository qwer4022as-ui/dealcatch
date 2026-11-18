import { describe, expect, it } from "vitest";
import { priceDefaults, registerDefaults } from "./prefill";
import type { CapturePayload } from "./payload";

const p: CapturePayload = {
  externalId: "1",
  url: "https://www.musinsa.com/products/1",
  name: "울 코트",
  brand: "테스트",
  modelNo: "AB-1",
  salePrice: 129000,
  listPrice: 189000,
  options: [
    { label: "블랙 / M", soldOut: false },
    { label: "블랙 / L", soldOut: true },
    { label: "네이비 / M", soldOut: false },
    { label: "블랙 / XL", soldOut: null },
  ],
};

describe("registerDefaults", () => {
  it("옵션은 한 줄에 하나, 카테고리는 비움", () => {
    expect(registerDefaults(p)).toEqual({
      url: p.url, brand: "테스트", name: "울 코트", modelNo: "AB-1", category: "",
      options: "블랙 / M\n블랙 / L\n네이비 / M\n블랙 / XL",
    });
  });
});

describe("priceDefaults", () => {
  it("가격은 모든 옵션에, 재고는 이름이 맞고 알려진 옵션만 (모르면 unknown, 표기 차이 무시)", () => {
    const r = priceDefaults(p, [
      { listingVariantId: 10, optionLabel: "블랙/M" },
      { listingVariantId: 11, optionLabel: "블랙 / L" },
      { listingVariantId: 12, optionLabel: "그레이 / M" },
      { listingVariantId: 13, optionLabel: "블랙 / XL" },
    ]);
    expect(r.values).toEqual({
      sale_10: "129000", list_10: "189000", stock_10: "in_stock",
      sale_11: "129000", list_11: "189000", stock_11: "sold_out",
      sale_12: "129000", list_12: "189000", stock_12: "unknown",
      sale_13: "129000", list_13: "189000", stock_13: "unknown",
    });
    expect(r.unmatched).toEqual(["네이비 / M"]);
  });

  it("가격을 못 읽었으면 가격 칸은 비워 둠", () => {
    const r = priceDefaults({ ...p, salePrice: null, listPrice: null, options: [] }, [{ listingVariantId: 1, optionLabel: "FREE" }]);
    expect(r.values).toEqual({ stock_1: "unknown" });
  });
});
