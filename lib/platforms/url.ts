// 상품 URL → 플랫폼·상품 번호. 네트워크 요청을 보내지 않는다 (docs/platform-reviews/musinsa.md).
// 초기 지원 플랫폼은 무신사 1개 (PRD §2.1).

export type ParsedProductUrl =
  | { ok: true; platform: "musinsa"; externalId: string; canonicalUrl: string }
  | { ok: false; reason: "invalid_url" | "unsupported_platform" | "not_product_page"; platformName?: string };

const MUSINSA_HOSTS = new Set(["musinsa.com", "www.musinsa.com", "m.musinsa.com", "store.musinsa.com"]);
const MUSINSA_PATHS = [/^\/products\/(\d{1,12})\/?$/, /^\/app\/goods\/(\d{1,12})\/?$/, /^\/goods\/(\d{1,12})\/?$/];

const KNOWN_UNSUPPORTED: Record<string, string> = {
  "29cm.co.kr": "29CM",
  "wconcept.co.kr": "W컨셉",
};

export function parseProductUrl(input: string): ParsedProductUrl {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid_url" };

  const host = url.hostname.toLowerCase();
  if (MUSINSA_HOSTS.has(host)) {
    for (const re of MUSINSA_PATHS) {
      const m = url.pathname.match(re);
      if (m) {
        return {
          ok: true,
          platform: "musinsa",
          externalId: m[1],
          canonicalUrl: `https://www.musinsa.com/products/${m[1]}`,
        };
      }
    }
    return { ok: false, reason: "not_product_page", platformName: "무신사" };
  }

  const known = Object.entries(KNOWN_UNSUPPORTED).find(([d]) => host === d || host.endsWith(`.${d}`));
  return { ok: false, reason: "unsupported_platform", platformName: known?.[1] };
}
