import { describe, expect, it } from "vitest";
import { parseKstLocal, parsePrice, toKstLocal, validatePriceForm, type PriceRowInput } from "./prices";

const NOW = new Date("2026-11-18T05:00:00Z"); // KST 14:00
const row = (over: Partial<PriceRowInput> = {}): PriceRowInput => ({
  listingVariantId: 1,
  label: "블랙 / M",
  listPrice: "189,000",
  salePrice: "129,000",
  stock: "in_stock",
  previousSale: 129000,
  ...over,
});
const validate = (rows: PriceRowInput[], over: { at?: string; confirm?: boolean } = {}) =>
  validatePriceForm({ collectedAtLocal: over.at ?? "2026-11-18T13:30", rows, confirmBigChange: over.confirm ?? false, now: NOW });

describe("KST 시각 변환", () => {
  it("datetime-local 값은 KST 로 해석", () => {
    expect(parseKstLocal("2026-11-18T13:30")?.toISOString()).toBe("2026-11-18T04:30:00.000Z");
    expect(toKstLocal(NOW)).toBe("2026-11-18T14:00");
    expect(parseKstLocal("2026-11-18 13:30")).toBeNull();
  });
});

describe("parsePrice", () => {
  it("쉼표·원·공백 허용, 빈 값 null, 소수·음수·문자는 NaN", () => {
    expect(parsePrice("129,000원")).toBe(129000);
    expect(parsePrice("  ")).toBeNull();
    expect(parsePrice("12.5")).toBeNaN();
    expect(parsePrice("-100")).toBeNaN();
    expect(parsePrice("abc")).toBeNaN();
  });
});

describe("validatePriceForm", () => {
  it("정상 입력 → 저장 항목", () => {
    const r = validate([row()]);
    expect(r).toEqual({
      ok: true,
      collectedAt: new Date("2026-11-18T04:30:00Z"),
      items: [{ listing_variant_id: 1, list_price: 189000, sale_price: 129000, stock_status: "in_stock" }],
    });
  });
  it("판매가를 비운 옵션은 건너뜀, 정가는 선택", () => {
    const r = validate([row({ salePrice: "", listPrice: "" }), row({ listingVariantId: 2, listPrice: "" })]);
    expect(r.ok && r.items.map((i) => [i.listing_variant_id, i.list_price])).toEqual([[2, null]]);
  });
  it("미래 시각 거부 (5분 여유)", () => {
    expect(validate([row()], { at: "2026-11-18T14:04" }).ok).toBe(true);
    expect(validate([row()], { at: "2026-11-18T14:10" }).ok).toBe(false);
  });
  it("0원·판매가 > 정가·정가만 입력 거부", () => {
    expect(validate([row({ salePrice: "0" })]).ok).toBe(false);
    expect(validate([row({ salePrice: "200000" })]).ok).toBe(false);
    expect(validate([row({ salePrice: "" })]).ok).toBe(false);
  });
  it("아무것도 입력하지 않으면 거부", () => {
    const r = validate([row({ salePrice: "", listPrice: "" })]);
    expect(!r.ok && r.errors).toEqual(["가격을 1개 이상 입력해 주세요."]);
  });
  it("직전 대비 50% 초과 변동은 확인 체크가 있어야 저장", () => {
    const big = row({ salePrice: "12,900" });
    const r = validate([big]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.bigChanges).toEqual(["블랙 / M: 직전 129,000원 → 12,900원"]);
    expect(validate([big], { confirm: true }).ok).toBe(true);
  });
  it("직전 기록이 없으면 변동 확인 없음, 알 수 없는 재고 값은 unknown", () => {
    const r = validate([row({ previousSale: null, salePrice: "1000", stock: "weird" })]);
    expect(r.ok && r.items[0].stock_status).toBe("unknown");
  });
});
