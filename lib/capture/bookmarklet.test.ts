import { describe, expect, it, vi } from "vitest";
import { buildBookmarkletCode, buildBookmarkletHref } from "./bookmarklet";
import { decodeCapture } from "./payload";

// 사용자가 실제 무신사 상품 페이지(2026-11-18)에서 확인한 meta 값
const MUSINSA_META: Record<string, string> = {
  "og:type": "product",
  "og:title":
    "피뎁트 모터사이클(PHYPS MOTORCYCLE) H-Tech Double Face Balaclava Zip-Up Hoodie Black - 사이즈 & 후기 | 무신사 | 무신사",
  "og:url": "https://www.musinsa.com/products/7160101",
  "product:brand": "피뎁트 모터사이클",
  "product:availability": "주문가능",
  "product:price:amount": "115400",
  "product:price:currency": "KRW",
  "product:retailer_item_id": "주식회사 워즈코퍼레이션",
  "product:price:normal_price": "129900",
  "product:price:sale_rate": "11",
};

/** 실제 북마클릿 코드를 가짜 페이지 환경에서 실행 */
function run(meta: Record<string, string>, hostname = "www.musinsa.com") {
  const open = vi.fn();
  const alert = vi.fn();
  const document = {
    querySelector: (sel: string) => {
      const m = sel.match(/^meta\[property="(.+)"\]$/);
      const v = m ? meta[m[1]] : undefined;
      return v === undefined ? null : { getAttribute: () => v };
    },
  };
  const location = { hostname, href: `https://${hostname}/products/7160101?utm=x` };
  const code = buildBookmarkletCode("http://localhost:3008");
  new Function("document", "location", "window", "alert", code)(document, location, { open }, alert);
  return { open, alert };
}

describe("북마클릿 (실제 코드 실행)", () => {
  it("무신사 meta → /capture 새 탭, 값이 검증을 통과", () => {
    const { open, alert } = run(MUSINSA_META);
    expect(alert).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target, features] = open.mock.calls[0];
    expect(target).toBe("_blank");
    expect(features).toBe("noopener");
    expect(url.startsWith("http://localhost:3008/capture#d=")).toBe(true);

    const r = decodeCapture(url.split("#d=")[1]);
    expect(r).toEqual({
      ok: true,
      value: {
        externalId: "7160101",
        url: "https://www.musinsa.com/products/7160101",
        name: "H-Tech Double Face Balaclava Zip-Up Hoodie Black",
        brand: "피뎁트 모터사이클",
        modelNo: "",
        salePrice: 115400,
        listPrice: 129900,
        options: [],
      },
    });
  });

  it("무신사가 아닌 사이트에서는 안내만 하고 아무것도 열지 않음", () => {
    const { open, alert } = run(MUSINSA_META, "evil.example");
    expect(open).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledOnce();
  });

  it("가격 meta 가 없으면 안내만", () => {
    const { open, alert } = run({ ...MUSINSA_META, "product:price:amount": "" });
    expect(open).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledOnce();
  });

  it("브랜드 접두어가 없는 제목도 처리", () => {
    const { open } = run({ ...MUSINSA_META, "og:title": "기본 티셔츠 | 무신사" });
    const r = decodeCapture(open.mock.calls[0][0].split("#d=")[1]);
    expect(r.ok && r.value.name).toBe("기본 티셔츠");
  });
});

describe("buildBookmarkletHref", () => {
  it("javascript: 주소, 이상한 앱 주소는 거부", () => {
    expect(buildBookmarkletHref("https://ax-private.vercel.app").startsWith("javascript:")).toBe(true);
    expect(() => buildBookmarkletCode('http://x"};alert(1);//')).toThrow();
  });
});
