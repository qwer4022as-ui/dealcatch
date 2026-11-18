// 검증된 북마클릿 값 → 폼 기본값 (순수 함수)

import type { ProductFormValues } from "@/lib/forms/product";
import { normalizeOptionLabel, optionsToText, type CapturePayload } from "./payload";

export function registerDefaults(p: CapturePayload): ProductFormValues {
  return {
    url: p.url,
    brand: p.brand,
    name: p.name,
    modelNo: p.modelNo,
    category: "",
    options: optionsToText(p.options),
  };
}

export interface PriceDefaults {
  /** PriceForm 의 name → 값 */
  values: Record<string, string>;
  /** 가져온 옵션 중 등록된 옵션과 이름이 맞지 않은 것 */
  unmatched: string[];
}

/**
 * 무신사는 보통 옵션별 가격이 같으므로 가져온 판매가·정가를 모든 옵션에 채운다.
 * 재고는 이름이 맞는 옵션만 반영하고, 맞지 않으면 "모름"으로 둔다.
 */
export function priceDefaults(
  p: CapturePayload,
  variants: { listingVariantId: number; optionLabel: string }[],
): PriceDefaults {
  const byLabel = new Map(p.options.map((o) => [normalizeOptionLabel(o.label), o]));
  const matched = new Set<string>();
  const values: Record<string, string> = {};

  for (const v of variants) {
    const key = normalizeOptionLabel(v.optionLabel);
    const opt = byLabel.get(key);
    if (opt) matched.add(key);
    if (p.salePrice !== null) values[`sale_${v.listingVariantId}`] = String(p.salePrice);
    if (p.listPrice !== null) values[`list_${v.listingVariantId}`] = String(p.listPrice);
    values[`stock_${v.listingVariantId}`] = opt ? (opt.soldOut ? "sold_out" : "in_stock") : p.options.length ? "unknown" : "in_stock";
  }

  const unmatched = p.options.filter((o) => !matched.has(normalizeOptionLabel(o.label))).map((o) => o.label);
  return { values, unmatched };
}
