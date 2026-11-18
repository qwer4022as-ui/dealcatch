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
// 사용자가 확인한 __NEXT_DATA__ 구조 (필요한 부분만). 다른 상품(추천 등) 데이터가 앞에 있어도 goodsNo 로 구분
const NEXT_DATA = JSON.stringify({
  props: {
    pageProps: {
      dehydratedState: {
        queries: [
          { state: { data: { data: { goodsNo: 9999999, styleNo: "OTHER-ITEM" } } } },
          { state: { data: null } },
          // 상세 정보 항목: 품번은 있고 옵션은 없음
          { state: { data: { data: { goodsNo: 7160101, goodsNm: "H-Tech Double Face", styleNo: "HGF1HZ333BBK" } } } },
          // 옵션 항목: 맨 위 goodsNo 없음, 옵션마다 goodsNo (사용자가 확인한 실제 구조)
          {
            state: {
              data: {
                data: {
                  basic: [{ no: 10613858, name: "사이즈", optionValues: [] }],
                  colorImages: [
                    { colorId: "1", colorName: "흰색" },
                    { colorId: "2", colorName: "블랙" },
                  ],
                  optionItems: ["S", "M", "L", "XL", "XXL"].map((size, i) => ({
                    no: 32720669 + i,
                    goodsNo: 7160101,
                    managedCode: size,
                    price: 0,
                    activated: true,
                    isDeleted: size === "XXL",
                    optionValues: [{ no: 24993702 + i, name: size, code: size, optionNo: 10613858, optionName: "사이즈" }],
                    colors: [{ optionItemNo: 32720669 + i, colorCode: "2", colorType: "MUSINSA" }],
                  })),
                },
              },
            },
          },
        ],
      },
    },
  },
});

function run(meta: Record<string, string>, hostname = "www.musinsa.com", nextData: string | null = NEXT_DATA) {
  const open = vi.fn();
  const alert = vi.fn();
  const document = {
    getElementById: (id: string) => (id === "__NEXT_DATA__" && nextData !== null ? { textContent: nextData } : null),
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
        modelNo: "HGF1HZ333BBK",
        salePrice: 115400,
        listPrice: 129900,
        options: ["S", "M", "L", "XL"].map((size) => ({ label: `블랙 / ${size}`, soldOut: null, extraPrice: 0 })),
        siblings: [],
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

describe("북마클릿 품번 읽기", () => {
  const modelOf = (nextData: string | null) => {
    const { open } = run(MUSINSA_META, "www.musinsa.com", nextData);
    const r = decodeCapture(open.mock.calls[0][0].split("#d=")[1]);
    return r.ok ? r.value.modelNo : "FAIL";
  };
  it("페이지 데이터가 없거나 깨져도 품번만 비우고 계속 진행", () => {
    expect(modelOf(null)).toBe("");
    expect(modelOf("{not json")).toBe("");
    expect(modelOf(JSON.stringify({ props: {} }))).toBe("");
  });
  it("같은 상품 번호가 없으면 다른 상품의 품번을 쓰지 않음", () => {
    expect(modelOf(NEXT_DATA.replace("7160101", "1234567"))).toBe("");
  });
});

describe("북마클릿 옵션 읽기", () => {
  const optionsOf = (items: unknown[]) => {
    const withGoods = items.map((it) => (it && typeof it === "object" ? { goodsNo: 7160101, ...it } : it));
    const nd = JSON.stringify({
      props: { pageProps: { dehydratedState: { queries: [{ state: { data: { data: { optionItems: withGoods } } } }] } } },
    });
    const { open } = run(MUSINSA_META, "www.musinsa.com", nd);
    const r = decodeCapture(open.mock.calls[0][0].split("#d=")[1]);
    return r.ok ? r.value.options : "FAIL";
  };
  it("색상 + 사이즈 두 단계 옵션 → '색상 / 사이즈', 추가금 보존", () => {
    expect(
      optionsOf([
        { price: 5000, optionValues: [{ name: "블랙", optionName: "색상" }, { name: "XL", optionName: "사이즈" }] },
        { price: 0, optionValues: [{ name: "네이비", optionName: "컬러" }] },
      ]),
    ).toEqual([
      { label: "블랙 / XL", soldOut: null, extraPrice: 5000 },
      { label: "네이비 /", soldOut: null, extraPrice: 0 },
    ]);
  });
  it("색상 선택 옵션이 없으면 색상 분류 코드 → 이름, 표에 없으면 비움", () => {
    const nd = JSON.stringify({
      props: {
        pageProps: {
          dehydratedState: {
            queries: [
              { state: { data: { data: { colorImages: [{ colorId: "2", colorName: "블랙" }] } } } },
              {
                state: {
                  data: {
                    data: {
                      optionItems: [
                        { goodsNo: 7160101, optionValues: [{ name: "M", optionName: "사이즈" }], colors: [{ colorCode: "2" }] },
                        { goodsNo: 7160101, optionValues: [{ name: "L", optionName: "사이즈" }], colors: [{ colorCode: "99" }] },
                        { goodsNo: 7160101, optionValues: [{ name: "아이보리", optionName: "COLOR" }, { name: "S", optionName: "SIZE" }], colors: [{ colorCode: "2" }] },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    const { open } = run(MUSINSA_META, "www.musinsa.com", nd);
    const r = decodeCapture(open.mock.calls[0][0].split("#d=")[1]);
    expect(r.ok && r.value.options.map((o) => o.label)).toEqual(["블랙 / M", "L", "아이보리 / S"]);
  });
  it("다른 상품의 옵션(추천 상품 등)은 쓰지 않음", () => {
    expect(optionsOf([{ goodsNo: 1234567, optionValues: [{ name: "M" }] }, { optionValues: [{ name: "L" }] }])).toEqual([
      { label: "L", soldOut: null, extraPrice: null },
    ]);
  });
  it("형식이 이상한 옵션은 건너뜀", () => {
    expect(optionsOf([null, { optionValues: "x" }, { optionValues: [{ name: "  " }] }, { optionValues: [{ name: "FREE" }] }])).toEqual([
      { label: "FREE", soldOut: null, extraPrice: null },
    ]);
  });
});

describe("즐겨찾기 주소 그대로 실행 (사용자 확인 데이터: 색상 코드 25 = 다크 그레이)", () => {
  it("javascript: 주소를 풀어 실행해도 색상·사이즈가 채워짐", () => {
    const nd = JSON.stringify({
      props: {
        pageProps: {
          dehydratedState: {
            queries: [
              { state: { data: { data: { goodsNo: 7160101, styleNo: "HGF1HZ333BBK" } } } },
              {
                state: {
                  data: {
                    data: {
                      optionItems: ["S", "M", "L", "XL"].map((size, i) => ({
                        no: 32720523 + i,
                        goodsNo: 7160101,
                        price: 0,
                        isDeleted: false,
                        optionValues: [{ name: size, optionName: "사이즈" }],
                        colors: [{ optionItemNo: 32720523 + i, colorCode: "25", colorType: "MUSINSA" }],
                      })),
                    },
                  },
                },
              },
              { state: { data: { data: {} } } },
              { state: { data: { data: {} } } },
              { state: { data: { data: {} } } },
              {
                state: {
                  data: {
                    data: {
                      colorImages: [
                        { colorId: "24", colorName: "라이트 그레이" },
                        { colorId: "25", colorName: "다크 그레이" },
                        { colorId: "26", colorName: "카멜" },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    const href = buildBookmarkletHref("http://localhost:3008");
    const code = decodeURIComponent(href.slice("javascript:".length));
    const open = vi.fn();
    const alert = vi.fn();
    const meta = MUSINSA_META;
    const document = {
      getElementById: (id: string) => (id === "__NEXT_DATA__" ? { textContent: nd } : null),
      querySelector: (sel: string) => {
        const m = sel.match(/^meta\[property="(.+)"\]$/);
        const v = m ? meta[m[1]] : undefined;
        return v === undefined ? null : { getAttribute: () => v };
      },
    };
    new Function("document", "location", "window", "alert", code)(
      document, { hostname: "www.musinsa.com", href: "https://www.musinsa.com/products/7160101" }, { open }, alert,
    );
    const r = decodeCapture(open.mock.calls[0][0].split("#d=")[1]);
    expect(r.ok && r.value.options.map((o) => o.label)).toEqual([
      "다크 그레이 / S", "다크 그레이 / M", "다크 그레이 / L", "다크 그레이 / XL",
    ]);
  });
});

describe("다른 색상 목록 (사용자 확인 데이터: Lightweight Windbreaker)", () => {
  it("현재 색상은 목록의 이름(Charcoal)으로, 다른 색상(Black)은 siblings 로", () => {
    const meta = { ...MUSINSA_META, "og:url": "https://www.musinsa.com/products/7160057", "product:price:amount": "84900", "product:price:normal_price": "99900" };
    const nd = JSON.stringify({
      props: {
        pageProps: {
          dehydratedState: {
            queries: [
              { queryKey: ["Detail", "Goods", 7160057], state: { data: { data: { goodsNo: 7160057, styleNo: "WB-CH" } } } },
              {
                queryKey: ["Detail", "Option", 7160057],
                state: { data: { data: { optionItems: ["M", "L"].map((size) => ({ goodsNo: 7160057, price: 0, optionValues: [{ name: size, optionName: "사이즈" }], colors: [{ colorCode: "25" }] })) } } },
              },
              {
                queryKey: ["Detail", "OtherColorGoods", 7160057],
                state: {
                  data: {
                    data: {
                      curationTabs: [
                        {
                          curationGoodsList: [
                            { goodsNo: 7160056, goodsName: "Lightweight Windbreaker Black", linkUrl: "https://www.musinsa.com/products/7160056", displayColorText: "Black", price: 84900, normalPrice: 99900, isSoldOut: false },
                            { goodsNo: 7160057, goodsName: "Lightweight Windbreaker Charcoal", linkUrl: "https://www.musinsa.com/products/7160057", displayColorText: "Charcoal", price: 84900, normalPrice: 99900, isSoldOut: false },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
              { queryKey: ["Common", "Colors"], state: { data: { data: { colorImages: [{ colorId: "25", colorName: "다크 그레이" }] } } } },
            ],
          },
        },
      },
    });
    const { open } = run(meta, "www.musinsa.com", nd);
    const r = decodeCapture(open.mock.calls[0][0].split("#d=")[1]);
    expect(r.ok && r.value.options.map((o) => o.label)).toEqual(["Charcoal / M", "Charcoal / L"]);
    expect(r.ok && r.value.siblings).toEqual([
      { externalId: "7160056", url: "https://www.musinsa.com/products/7160056", color: "Black", salePrice: 84900, listPrice: 99900, soldOut: false },
    ]);
  });
});

describe("buildBookmarkletHref", () => {
  it("javascript: 주소, 이상한 앱 주소는 거부", () => {
    expect(buildBookmarkletHref("https://ax-private.vercel.app").startsWith("javascript:")).toBe(true);
    expect(() => buildBookmarkletCode('http://x"};alert(1);//')).toThrow();
  });
});
