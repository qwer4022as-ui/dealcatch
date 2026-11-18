import { describe, expect, it } from "vitest";
import { parseOptions, validateProductForm, type ProductFormValues } from "./product";

const base: ProductFormValues = {
  url: "https://www.musinsa.com/products/3912345?utm_source=x",
  brand: " 테스트 브랜드 ",
  name: "울 코트",
  modelNo: "AB-1234",
  category: "아우터",
  options: "블랙 / S\n블랙 / M\n\n그레이/M",
  siblings: [],
};

describe("parseOptions", () => {
  it("색상 / 사이즈, 빈 줄 무시, 슬래시 주변 공백 정리", () => {
    expect(parseOptions(base.options).variants).toEqual([
      { color: "블랙", size: "S", label: "블랙 / S" },
      { color: "블랙", size: "M", label: "블랙 / M" },
      { color: "그레이", size: "M", label: "그레이 / M" },
    ]);
  });
  it("슬래시가 없으면 사이즈", () => {
    expect(parseOptions("FREE").variants).toEqual([{ color: "", size: "FREE", label: "FREE" }]);
  });
  it("색상만 있는 옵션 (북마클릿이 '네이비 /' 로 넘김)", () => {
    expect(parseOptions("네이비 /").variants).toEqual([{ color: "네이비", size: "", label: "네이비" }]);
  });
  it("중복(대소문자 무시)·형식 오류·빈 입력", () => {
    expect(parseOptions("블랙 / m\n블랙/M").errors).toHaveLength(1);
    expect(parseOptions("a / b / c").errors).toHaveLength(1);
    expect(parseOptions("  \n ").errors).toEqual(["옵션을 1개 이상 입력해 주세요."]);
  });
});

describe("validateProductForm", () => {
  it("정상 입력 → 정규 URL, 공백 정리, 옵션", () => {
    const r = validateProductForm(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ brand: "테스트 브랜드", modelNo: "AB-1234", category: "아우터" });
    expect(r.value.listings).toHaveLength(1);
    expect(r.value.listings[0]).toMatchObject({
      platform: "musinsa",
      externalId: "3912345",
      url: "https://www.musinsa.com/products/3912345",
    });
    expect(r.value.listings[0].variants).toHaveLength(3);
  });
  it("모델번호·카테고리는 선택", () => {
    const r = validateProductForm({ ...base, modelNo: " ", category: "" });
    expect(r.ok && r.value.modelNo === null && r.value.category === null).toBe(true);
  });
  it("지원하지 않는 플랫폼·필수값 누락은 모든 오류를 한 번에", () => {
    const r = validateProductForm({ ...base, url: "https://www.29cm.co.kr/products/1", brand: "", name: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(3);
    expect(r.errors[0]).toContain("29CM");
  });
  it("체크한 다른 색상만 판매처로 추가, 사이즈 × 색상 옵션", () => {
    const sib = (over: Partial<ProductFormValues["siblings"][number]>) => ({
      on: true, url: "https://www.musinsa.com/products/7160056", color: "Black", sizes: "M, L, m", note: "", ...over,
    });
    const r = validateProductForm({
      ...base,
      siblings: [sib({}), sib({ on: false, url: "https://www.musinsa.com/products/1", color: "Red" }), sib({ url: "https://www.musinsa.com/products/2", color: "White", sizes: "" })],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.listings.map((l) => [l.externalId, l.variants.map((v) => v.label)])).toEqual([
      ["3912345", ["블랙 / S", "블랙 / M", "그레이 / M"]],
      ["7160056", ["Black / M", "Black / L"]],
      ["2", ["White"]],
    ]);
  });
  it("다른 색상 오류: 주소·중복 페이지·색상 이름", () => {
    const r = validateProductForm({
      ...base,
      siblings: [
        { on: true, url: "https://evil.example/products/1", color: "Red", sizes: "M", note: "" },
        { on: true, url: base.url, color: "Black", sizes: "M", note: "" },
        { on: true, url: "https://www.musinsa.com/products/5", color: " ", sizes: "M", note: "" },
      ],
    });
    expect(!r.ok && r.errors).toHaveLength(3);
  });
  it("목록에 없는 카테고리 거부", () => {
    expect(validateProductForm({ ...base, category: "<script>" }).ok).toBe(false);
  });
});
