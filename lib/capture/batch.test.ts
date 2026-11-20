import { describe, expect, it } from "vitest";
import { decodeBatch } from "./batch";
import { encodeCapture } from "./payload";

const enc = (items: unknown[], over: Record<string, unknown> = {}) => encodeCapture({ v: 1, kind: "batch", items, ...over });

describe("decodeBatch", () => {
  it("상품 번호·가격 검증, 중복 제거, 판매가 > 정가면 교환", () => {
    const r = decodeBatch(
      enc([
        { goodsNo: 7160056, name: " Windbreaker\\n Black ", brand: "피뎁트", salePrice: 84900, listPrice: "99,900", soldOut: false },
        { goodsNo: "7160056", salePrice: 1 },
        { goodsNo: "abc", salePrice: 1 },
        { goodsNo: 1, salePrice: 200, listPrice: 100, soldOut: "x" },
        { goodsNo: 2, salePrice: -5 },
      ]),
    );
    expect(r).toEqual({
      ok: true,
      items: [
        { externalId: "7160056", name: "Windbreaker\\n Black", brand: "피뎁트", salePrice: 84900, listPrice: 99900, soldOut: false },
        { externalId: "1", name: "", brand: "", salePrice: 100, listPrice: 200, soldOut: null },
        { externalId: "2", name: "", brand: "", salePrice: null, listPrice: null, soldOut: null },
      ],
    });
  });

  it("종류·버전이 다르거나 상품이 없으면 거부", () => {
    expect(decodeBatch(enc([{ goodsNo: 1 }], { kind: "single" })).ok).toBe(false);
    expect(decodeBatch(enc([{ goodsNo: 1 }], { v: 2 })).ok).toBe(false);
    expect(decodeBatch(enc([])).ok).toBe(false);
    expect(decodeBatch("!!").ok).toBe(false);
  });

  it("최대 200개", () => {
    const r = decodeBatch(enc(Array.from({ length: 250 }, (_, i) => ({ goodsNo: i + 1, salePrice: 1000 }))));
    expect(r.ok && r.items.length).toBe(200);
  });
});
