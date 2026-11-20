// 일괄 기록 북마클릿 → 앱으로 넘어오는 값 (신뢰하지 않는 입력).
// 사용자가 보고 있는 무신사 목록 페이지 1개에 보이는 상품들의 상품 번호와 가격.
// URL 해시(#b=...)에 base64url(JSON)으로 담겨 오며 서버로 전송되지 않는다.

export const BATCH_VERSION = 1;
const MAX_ENCODED = 200_000;
const MAX_ITEMS = 200;
const MAX_PRICE = 100_000_000;

export interface BatchItem {
  externalId: string;
  name: string;
  brand: string;
  salePrice: number | null;
  listPrice: number | null;
  soldOut: boolean | null;
}

export type BatchResult = { ok: true; items: BatchItem[] } | { ok: false; error: string };

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

const price = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[,\s원]/g, "")) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n <= MAX_PRICE ? n : null;
};

export function decodeBatch(encoded: string): BatchResult {
  if (!encoded || encoded.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return { ok: false, error: "가져온 데이터 형식이 올바르지 않습니다." };
  }
  let raw: unknown;
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return { ok: false, error: "가져온 데이터를 읽을 수 없습니다." };
  }
  const r = (raw ?? {}) as Record<string, unknown>;
  if (r.v !== BATCH_VERSION || r.kind !== "batch") {
    return { ok: false, error: "북마클릿이 오래되었습니다. 북마클릿 안내 화면에서 다시 설치해 주세요." };
  }
  const items: BatchItem[] = [];
  const seen = new Set<string>();
  for (const it of Array.isArray(r.items) ? r.items.slice(0, MAX_ITEMS) : []) {
    const o = (it ?? {}) as Record<string, unknown>;
    const id = String(o.goodsNo ?? "");
    if (!/^\d{1,12}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    let sale = price(o.salePrice);
    let list = price(o.listPrice);
    if (sale !== null && list !== null && sale > list) [sale, list] = [list, sale];
    items.push({
      externalId: id,
      name: str(o.name, 200),
      brand: str(o.brand, 50),
      salePrice: sale,
      listPrice: list,
      soldOut: o.soldOut === true ? true : o.soldOut === false ? false : null,
    });
  }
  if (items.length === 0) return { ok: false, error: "이 페이지에서 상품을 찾지 못했습니다." };
  return { ok: true, items };
}
