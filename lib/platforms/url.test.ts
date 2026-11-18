import { describe, expect, it } from "vitest";
import { parseProductUrl } from "./url";

describe("parseProductUrl", () => {
  it("무신사 상품 URL 형식들 → 같은 상품 번호, 정규 URL (추적 파라미터 제거)", () => {
    for (const u of [
      "https://www.musinsa.com/products/3912345",
      "https://www.musinsa.com/products/3912345?utm_source=x&loc=1",
      "https://musinsa.com/products/3912345/",
      "https://m.musinsa.com/products/3912345",
      "https://store.musinsa.com/app/goods/3912345",
      "https://www.musinsa.com/goods/3912345#review",
      "  https://www.musinsa.com/products/3912345  ",
    ]) {
      expect(parseProductUrl(u)).toEqual({
        ok: true,
        platform: "musinsa",
        externalId: "3912345",
        canonicalUrl: "https://www.musinsa.com/products/3912345",
      });
    }
  });

  it("무신사지만 상품 페이지가 아님", () => {
    expect(parseProductUrl("https://www.musinsa.com/brand/abc")).toEqual({
      ok: false, reason: "not_product_page", platformName: "무신사",
    });
    expect(parseProductUrl("https://www.musinsa.com/products/abc").ok).toBe(false);
  });

  it("아직 지원하지 않는 플랫폼", () => {
    expect(parseProductUrl("https://www.29cm.co.kr/products/123")).toEqual({
      ok: false, reason: "unsupported_platform", platformName: "29CM",
    });
    expect(parseProductUrl("https://shop.example.com/p/1")).toEqual({ ok: false, reason: "unsupported_platform" });
  });

  it("비슷한 도메인으로 속이는 주소는 거부", () => {
    expect(parseProductUrl("https://musinsa.com.evil.example/products/1").ok).toBe(false);
    expect(parseProductUrl("https://evilmusinsa.com/products/1").ok).toBe(false);
  });

  it("URL 이 아니거나 http(s) 가 아님", () => {
    expect(parseProductUrl("musinsa 코트")).toEqual({ ok: false, reason: "invalid_url" });
    expect(parseProductUrl("javascript:alert(1)")).toEqual({ ok: false, reason: "invalid_url" });
  });
});
