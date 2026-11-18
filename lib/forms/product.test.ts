import { describe, expect, it } from "vitest";
import { parseOptions, validateProductForm, type ProductFormValues } from "./product";

const base: ProductFormValues = {
  url: "https://www.musinsa.com/products/3912345?utm_source=x",
  brand: " 테스트 브랜드 ",
  name: "울 코트",
  modelNo: "AB-1234",
  category: "아우터",
  options: "블랙 / S\n블랙 / M\n\n그레이/M",
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
    expect(r.value).toMatchObject({
      platform: "musinsa",
      externalId: "3912345",
      url: "https://www.musinsa.com/products/3912345",
      brand: "테스트 브랜드",
      modelNo: "AB-1234",
      category: "아우터",
    });
    expect(r.value.variants).toHaveLength(3);
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
  it("목록에 없는 카테고리 거부", () => {
    expect(validateProductForm({ ...base, category: "<script>" }).ok).toBe(false);
  });
});
