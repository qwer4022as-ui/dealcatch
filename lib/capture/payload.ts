// 북마클릿 → 앱으로 넘어오는 값 (신뢰하지 않는 입력).
// URL 해시(#d=...)에 base64url(JSON)으로 담겨 오며 서버로 전송되지 않는다.
// 검증을 통과한 값은 폼 기본값을 채우는 데만 쓴다. 저장은 사용자가 확인 후 직접 한다.

import { parseProductUrl } from "@/lib/platforms/url";

export const CAPTURE_VERSION = 1;
const MAX_ENCODED = 20_000;
const MAX_OPTIONS = 50;
const MAX_PRICE = 100_000_000;

export interface CaptureOption {
  label: string;
  /** 품절 여부. 페이지에서 알 수 없으면 null (추측하지 않는다) */
  soldOut: boolean | null;
}

export interface CapturePayload {
  externalId: string;
  url: string;
  name: string;
  brand: string;
  modelNo: string;
  salePrice: number | null;
  listPrice: number | null;
  options: CaptureOption[];
}

export type CaptureResult = { ok: true; value: CapturePayload } | { ok: false; error: string };

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

const price = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[,\s원]/g, "")) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n <= MAX_PRICE ? n : null;
};

/** JSON → base64url (UTF-8). 브라우저·서버 공용 */
export function encodeCapture(data: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url(JSON) → 검증된 값. 브라우저·서버 공용 (Buffer 없이 atob 사용) */
export function decodeCapture(encoded: string): CaptureResult {
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
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "가져온 데이터 형식이 올바르지 않습니다." };
  const r = raw as Record<string, unknown>;
  if (r.v !== CAPTURE_VERSION) return { ok: false, error: "북마클릿이 오래되었습니다. 북마클릿 안내 화면에서 다시 설치해 주세요." };

  const parsed = parseProductUrl(typeof r.url === "string" ? r.url : "");
  if (!parsed.ok) return { ok: false, error: "무신사 상품 페이지에서만 사용할 수 있습니다." };

  const seen = new Set<string>();
  const options: CaptureOption[] = [];
  for (const o of Array.isArray(r.options) ? r.options.slice(0, MAX_OPTIONS) : []) {
    const label = str((o as Record<string, unknown>)?.label, 60);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const so = (o as Record<string, unknown>)?.soldOut;
    options.push({ label, soldOut: so === true ? true : so === false ? false : null });
  }

  let sale = price(r.salePrice);
  let list = price(r.listPrice);
  if (sale !== null && list !== null && sale > list) [sale, list] = [list, sale];

  return {
    ok: true,
    value: {
      externalId: parsed.externalId,
      url: parsed.canonicalUrl,
      name: str(r.name, 200),
      brand: str(r.brand, 50),
      modelNo: str(r.modelNo, 50),
      salePrice: sale,
      listPrice: list,
      options,
    },
  };
}

/** 옵션 이름 비교용: 공백·대소문자·구분자 차이 무시 */
export function normalizeOptionLabel(label: string): string {
  return label.toLowerCase().replace(/[\s/|,·\-_]+/g, "");
}

/** 등록 폼의 옵션 칸 텍스트 ("색상 / 사이즈" 한 줄씩) */
export function optionsToText(options: CaptureOption[]): string {
  return options.map((o) => o.label).join("\n");
}
