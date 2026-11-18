// 수동 가격 입력 폼 검증 (순수 함수)
// 원칙: 실제로 확인한 가격만 기록한다. 미래 시각·비정상 금액은 거부하고, 큰 변동은 한 번 더 확인받는다.

import type { StockStatus } from "@/lib/pricing/types";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MAX_PRICE = 100_000_000;
export const BIG_CHANGE_PCT = 50;
const STOCK_VALUES: StockStatus[] = ["in_stock", "low", "sold_out", "unknown"];

export interface PriceRowInput {
  listingVariantId: number;
  label: string;
  listPrice: string;
  salePrice: string;
  stock: string;
  /** 직전 유효 판매가 (없으면 null) */
  previousSale: number | null;
}

export interface PriceItem {
  listing_variant_id: number;
  list_price: number | null;
  sale_price: number;
  stock_status: StockStatus;
}

export type PriceValidation =
  | { ok: true; collectedAt: Date; items: PriceItem[] }
  | { ok: false; errors: string[]; bigChanges: string[] };

/** "YYYY-MM-DDTHH:mm" (datetime-local, KST 로 해석) → Date */
export function parseKstLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → datetime-local 기본값 (KST) */
export function toKstLocal(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);
}

/** "129,000" / "129000" → 129000. 빈 값은 null, 잘못된 값은 NaN */
export function parsePrice(raw: string): number | null {
  const s = raw.replace(/[,\s원]/g, "");
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return Number.NaN;
  return Number(s);
}

export function validatePriceForm(input: {
  collectedAtLocal: string;
  rows: PriceRowInput[];
  confirmBigChange: boolean;
  now: Date;
}): PriceValidation {
  const errors: string[] = [];
  const bigChanges: string[] = [];

  const collectedAt = parseKstLocal(input.collectedAtLocal);
  if (!collectedAt) errors.push("확인 시각을 입력해 주세요.");
  else if (collectedAt.getTime() > input.now.getTime() + 5 * 60 * 1000) errors.push("확인 시각은 미래일 수 없습니다.");

  const items: PriceItem[] = [];
  for (const r of input.rows) {
    const sale = parsePrice(r.salePrice);
    const list = parsePrice(r.listPrice);
    if (sale === null) {
      if (list !== null) errors.push(`${r.label}: 판매가를 입력하거나 정가도 비워 두세요.`);
      continue; // 비운 옵션은 저장하지 않는다
    }
    if (!Number.isSafeInteger(sale) || sale <= 0 || sale > MAX_PRICE) {
      errors.push(`${r.label}: 판매가는 1원 이상의 정수여야 합니다.`);
      continue;
    }
    if (list !== null && (!Number.isSafeInteger(list) || list <= 0 || list > MAX_PRICE)) {
      errors.push(`${r.label}: 정가는 1원 이상의 정수여야 합니다.`);
      continue;
    }
    if (list !== null && sale > list) {
      errors.push(`${r.label}: 판매가가 정가보다 클 수 없습니다.`);
      continue;
    }
    const stock = (STOCK_VALUES as string[]).includes(r.stock) ? (r.stock as StockStatus) : "unknown";
    if (r.previousSale !== null) {
      const change = (Math.abs(sale - r.previousSale) / r.previousSale) * 100;
      if (change > BIG_CHANGE_PCT) {
        bigChanges.push(`${r.label}: 직전 ${r.previousSale.toLocaleString("ko-KR")}원 → ${sale.toLocaleString("ko-KR")}원`);
      }
    }
    items.push({ listing_variant_id: r.listingVariantId, list_price: list, sale_price: sale, stock_status: stock });
  }

  if (items.length === 0 && errors.length === 0) errors.push("가격을 1개 이상 입력해 주세요.");
  if (bigChanges.length > 0 && !input.confirmBigChange) {
    errors.push(`직전 기록보다 ${BIG_CHANGE_PCT}% 넘게 바뀐 가격이 있습니다. 맞다면 확인란에 체크하고 다시 저장해 주세요.`);
  }
  if (errors.length > 0 || !collectedAt) return { ok: false, errors, bigChanges };
  return { ok: true, collectedAt, items };
}
