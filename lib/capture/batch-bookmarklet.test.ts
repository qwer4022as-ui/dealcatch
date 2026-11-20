import { describe, expect, it, vi } from "vitest";
import { BATCH_BOOKMARKLET_SOURCE, buildBookmarkletHref } from "./bookmarklet";
import { decodeBatch } from "./batch";

// 사용자가 무신사 추천 페이지(2026-11-20)에서 확인한 카드 속성
type Card = { attrs: Record<string, string>; text: string; alt?: string };
const CARDS: Card[] = [
  // 배너: data-item-id 없음 → 제외
  { attrs: { "data-content-id": "118654", "data-content-type": "banner" }, text: "나연이 입은 겨울 단독 컬렉션" },
  {
    attrs: { "data-item-id": "6696803", "data-price": "19880", "data-original-price": "25900", "data-best-price": "17900" },
    text: "무신사 스탠다드 스포츠[굿펠로우] 써모메쉬 글러브 (4color)31%17,900원5044.7(10)",
    alt: "[굿펠로우] 써모메쉬 글러브 (4color)",
  },
  {
    attrs: { "data-item-id": "4494697", "data-price": "239600", "data-original-price": "599000", "data-best-price": "239600" },
    text: "다이나핏BLACKLIGHT (블랙라이트) 여성 롱다운_Black YWW24537Z160%239,600원8185.0(3)",
  },
  // 같은 상품이 다시 나오면 한 번만
  { attrs: { "data-item-id": "4494697", "data-price": "1", "data-original-price": "1" }, text: "" },
  { attrs: { "data-item-id": "111", "data-price": "50000", "data-original-price": "60000" }, text: "어떤 상품 품절" },
  { attrs: { "data-item-id": "222", "data-price": "50000", "data-original-price": "60000" }, text: "어떤 상품 품절 임박" },
];

function run(cards: Card[], hostname = "www.musinsa.com") {
  const open = vi.fn();
  const alert = vi.fn();
  const el = (c: Card) => ({
    getAttribute: (n: string) => c.attrs[n] ?? null,
    querySelector: (sel: string) => (sel === "img" && c.alt ? { getAttribute: (n: string) => (n === "alt" ? c.alt : null) } : null),
    textContent: c.text,
  });
  const document = {
    querySelectorAll: (sel: string) =>
      sel === "[data-item-id][data-price]" ? cards.filter((c) => c.attrs["data-item-id"] && c.attrs["data-price"]).map(el) : [],
  };
  // 실제 즐겨찾기 주소를 풀어서 실행
  const href = buildBookmarkletHref("https://ax-private-n34m.vercel.app", BATCH_BOOKMARKLET_SOURCE);
  const code = decodeURIComponent(href.slice("javascript:".length));
  new Function("document", "location", "window", "alert", code)(document, { hostname }, { open }, alert);
  return { open, alert };
}

describe("일괄 기록 북마클릿 (실제 코드 실행)", () => {
  it("상품 카드만, 판매가는 data-price (혜택가 아님), 품절 임박은 품절 아님", () => {
    const { open, alert } = run(CARDS);
    expect(alert).not.toHaveBeenCalled();
    const [url, target, features] = open.mock.calls[0];
    expect([target, features]).toEqual(["_blank", "noopener"]);
    expect(url.startsWith("https://ax-private-n34m.vercel.app/capture/batch#b=")).toBe(true);
    const r = decodeBatch(url.split("#b=")[1]);
    expect(r).toEqual({
      ok: true,
      items: [
        { externalId: "6696803", name: "[굿펠로우] 써모메쉬 글러브 (4color)", brand: "", salePrice: 19880, listPrice: 25900, soldOut: null },
        { externalId: "4494697", name: "", brand: "", salePrice: 239600, listPrice: 599000, soldOut: null },
        { externalId: "111", name: "", brand: "", salePrice: 50000, listPrice: 60000, soldOut: true },
        { externalId: "222", name: "", brand: "", salePrice: 50000, listPrice: 60000, soldOut: null },
      ],
    });
  });

  it("상품 카드가 없거나 무신사가 아니면 안내만", () => {
    expect(run([CARDS[0]]).alert).toHaveBeenCalledOnce();
    const other = run(CARDS, "evil.example");
    expect(other.open).not.toHaveBeenCalled();
    expect(other.alert).toHaveBeenCalledOnce();
  });
});
