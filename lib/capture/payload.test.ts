import { describe, expect, it } from "vitest";
import { decodeCapture, encodeCapture, normalizeOptionLabel, optionsToText } from "./payload";

const valid = {
  v: 1,
  url: "https://www.musinsa.com/products/3912345?utm_source=bm",
  name: "  울 코트\n ",
  brand: "테스트",
  modelNo: "AB-1234",
  salePrice: "129,000",
  listPrice: 189000,
  options: [{ label: "블랙 / M", soldOut: false, extraPrice: null }, { label: "블랙 / L", soldOut: true, extraPrice: null }, { label: "블랙 / M" }, { label: "블랙 / XL" }],
};

describe("decodeCapture", () => {
  it("정상 값 → 정규 URL, 공백 정리, 가격 숫자화, 옵션 중복 제거", () => {
    const r = decodeCapture(encodeCapture(valid));
    expect(r).toEqual({
      ok: true,
      value: {
        externalId: "3912345",
        url: "https://www.musinsa.com/products/3912345",
        name: "울 코트",
        brand: "테스트",
        modelNo: "AB-1234",
        salePrice: 129000,
        listPrice: 189000,
        options: [
          { label: "블랙 / M", soldOut: false, extraPrice: null },
          { label: "블랙 / L", soldOut: true, extraPrice: null },
          { label: "블랙 / XL", soldOut: null, extraPrice: null },
        ],
      },
    });
  });

  it("한글이 깨지지 않음 (UTF-8)", () => {
    const r = decodeCapture(encodeCapture({ ...valid, name: "램스울 크루넥 니트 🧶" }));
    expect(r.ok && r.value.name).toBe("램스울 크루넥 니트 🧶");
  });

  it("무신사 상품 URL 이 아니면 거부", () => {
    expect(decodeCapture(encodeCapture({ ...valid, url: "https://evil.example/products/1" })).ok).toBe(false);
  });

  it("버전이 다르면 재설치 안내", () => {
    const r = decodeCapture(encodeCapture({ ...valid, v: 0 }));
    expect(!r.ok && r.error).toContain("다시 설치");
  });

  it("비정상 가격은 null, 판매가 > 정가면 서로 바꿈", () => {
    const r1 = decodeCapture(encodeCapture({ ...valid, salePrice: -1, listPrice: "abc" }));
    expect(r1.ok && [r1.value.salePrice, r1.value.listPrice]).toEqual([null, null]);
    const r2 = decodeCapture(encodeCapture({ ...valid, salePrice: 200000, listPrice: 100000 }));
    expect(r2.ok && [r2.value.salePrice, r2.value.listPrice]).toEqual([100000, 200000]);
  });

  it("형식이 깨진 입력·너무 큰 입력·잘못된 문자 거부", () => {
    expect(decodeCapture("").ok).toBe(false);
    expect(decodeCapture("not base64!").ok).toBe(false);
    expect(decodeCapture("x".repeat(20_001)).ok).toBe(false);
    expect(decodeCapture(Buffer.from("[1,2]").toString("base64url")).ok).toBe(false);
  });

  it("제어 문자 제거, 길이 제한", () => {
    const r = decodeCapture(encodeCapture({ ...valid, name: "a\u0000b" + "가".repeat(300) }));
    expect(r.ok && r.value.name.startsWith("a b")).toBe(true);
    expect(r.ok && r.value.name.length).toBe(200);
  });
});

describe("옵션 도우미", () => {
  it("이름 비교는 공백·구분자·대소문자 무시", () => {
    expect(normalizeOptionLabel("블랙 / M")).toBe(normalizeOptionLabel("블랙M"));
    expect(normalizeOptionLabel("BLACK-m")).toBe(normalizeOptionLabel("black / M"));
  });
  it("등록 폼 텍스트", () => {
    expect(optionsToText([{ label: "블랙 / M", soldOut: false, extraPrice: null }, { label: "FREE", soldOut: false, extraPrice: null }])).toBe("블랙 / M\nFREE");
  });
});
