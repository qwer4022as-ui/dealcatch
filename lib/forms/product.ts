// 상품 등록 폼 검증 (순수 함수)

import { parseProductUrl } from "@/lib/platforms/url";

export const CATEGORIES = ["아우터", "상의", "하의", "신발", "가방", "액세서리", "기타"] as const;
const MAX_OPTIONS = 50;

export interface ProductFormValues {
  url: string;
  brand: string;
  name: string;
  modelNo: string;
  category: string;
  options: string;
}

export interface VariantInput {
  color: string;
  size: string;
  label: string;
}

export interface ValidProduct {
  platform: "musinsa";
  externalId: string;
  url: string;
  brand: string;
  name: string;
  modelNo: string | null;
  category: string | null;
  variants: VariantInput[];
}

export type ProductValidation = { ok: true; value: ValidProduct } | { ok: false; errors: string[] };

/**
 * 옵션 입력: 한 줄에 하나, "색상 / 사이즈". 슬래시가 없으면 사이즈로 본다 (예: "FREE").
 * 색상만 있으면 "네이비 /" 처럼 슬래시를 붙인다.
 * 같은 옵션이 두 번 나오면 오류.
 */
export function parseOptions(text: string): { variants: VariantInput[]; errors: string[] } {
  const errors: string[] = [];
  const variants: VariantInput[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > MAX_OPTIONS) errors.push(`옵션은 최대 ${MAX_OPTIONS}개까지 입력할 수 있습니다.`);

  for (const line of lines.slice(0, MAX_OPTIONS)) {
    const parts = line.split("/").map((p) => p.trim());
    if (parts.length > 2) {
      errors.push(`"${line}": 색상 / 사이즈 형식으로 입력해 주세요.`);
      continue;
    }
    const [color, size] = parts.length === 2 ? parts : ["", parts[0]];
    if (!color && !size) continue;
    if (color.length > 30 || size.length > 30) {
      errors.push(`"${line}": 색상·사이즈는 각각 30자 이하로 입력해 주세요.`);
      continue;
    }
    const label = color && size ? `${color} / ${size}` : color || size;
    const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
    if (seen.has(key)) {
      errors.push(`"${label}" 옵션이 중복되었습니다.`);
      continue;
    }
    seen.add(key);
    variants.push({ color, size, label });
  }
  if (variants.length === 0 && errors.length === 0) errors.push("옵션을 1개 이상 입력해 주세요.");
  return { variants, errors };
}

export function validateProductForm(v: ProductFormValues): ProductValidation {
  const errors: string[] = [];

  const parsed = parseProductUrl(v.url);
  if (!parsed.ok) {
    errors.push(
      parsed.reason === "invalid_url"
        ? "올바른 상품 URL을 입력해 주세요."
        : parsed.reason === "not_product_page"
          ? `${parsed.platformName} 상품 페이지 주소가 아닙니다. 상품 상세 페이지의 주소를 넣어 주세요.`
          : `${parsed.platformName ?? "이 사이트"}는 아직 지원하지 않습니다. 현재는 무신사만 등록할 수 있습니다.`,
    );
  }

  const brand = v.brand.trim();
  const name = v.name.trim();
  const modelNo = v.modelNo.trim();
  if (!brand) errors.push("브랜드를 입력해 주세요.");
  else if (brand.length > 50) errors.push("브랜드는 50자 이하로 입력해 주세요.");
  if (!name) errors.push("상품명을 입력해 주세요.");
  else if (name.length > 200) errors.push("상품명은 200자 이하로 입력해 주세요.");
  if (modelNo.length > 50) errors.push("모델번호는 50자 이하로 입력해 주세요.");
  const category = v.category.trim();
  if (category && !(CATEGORIES as readonly string[]).includes(category)) errors.push("카테고리를 목록에서 골라 주세요.");

  const options = parseOptions(v.options);
  errors.push(...options.errors);

  if (errors.length > 0 || !parsed.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      platform: parsed.platform,
      externalId: parsed.externalId,
      url: parsed.canonicalUrl,
      brand,
      name,
      modelNo: modelNo || null,
      category: category || null,
      variants: options.variants,
    },
  };
}
