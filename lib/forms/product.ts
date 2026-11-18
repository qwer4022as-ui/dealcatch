// 상품 등록 폼 검증 (순수 함수)

import { parseProductUrl } from "@/lib/platforms/url";

export const CATEGORIES = ["아우터", "상의", "하의", "신발", "가방", "액세서리", "기타"] as const;
const MAX_OPTIONS = 50;

/** 같은 상품의 다른 색상 페이지 (무신사는 색상마다 상품 번호가 다르다) */
export interface SiblingFormValues {
  on: boolean;
  url: string;
  color: string;
  /** 쉼표로 구분한 사이즈 (비우면 색상만 있는 옵션 1개) */
  sizes: string;
  /** 화면 표시용 (예: "84,900원 · 품절") */
  note: string;
}

export interface ProductFormValues {
  url: string;
  brand: string;
  name: string;
  modelNo: string;
  category: string;
  options: string;
  siblings: SiblingFormValues[];
}

export interface VariantInput {
  color: string;
  size: string;
  label: string;
}

export interface ValidListing {
  platform: "musinsa";
  externalId: string;
  url: string;
  variants: VariantInput[];
}

export interface ValidProduct {
  brand: string;
  name: string;
  modelNo: string | null;
  category: string | null;
  /** 첫 번째가 현재 페이지, 나머지는 함께 등록할 다른 색상 */
  listings: ValidListing[];
}

const MAX_SIBLINGS = 20;

/** "S, M , L" → ["S", "M", "L"] (중복·빈 값 제거) */
export function parseSizes(text: string): { sizes: string[]; error: string | null } {
  const sizes: string[] = [];
  for (const raw of text.split(",")) {
    const size = raw.trim();
    if (!size) continue;
    if (size.length > 30) return { sizes, error: `사이즈 "${size.slice(0, 10)}…"는 30자 이하로 입력해 주세요.` };
    if (!sizes.some((x) => x.toLowerCase() === size.toLowerCase())) sizes.push(size);
  }
  if (sizes.length > MAX_OPTIONS) return { sizes, error: `사이즈는 최대 ${MAX_OPTIONS}개까지 입력할 수 있습니다.` };
  return { sizes, error: null };
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

  const listings: ValidListing[] = [];
  if (parsed.ok) listings.push({ platform: parsed.platform, externalId: parsed.externalId, url: parsed.canonicalUrl, variants: options.variants });

  const checked = v.siblings.filter((sb) => sb.on);
  if (checked.length > MAX_SIBLINGS) errors.push(`다른 색상은 최대 ${MAX_SIBLINGS}개까지 함께 등록할 수 있습니다.`);
  for (const sb of checked.slice(0, MAX_SIBLINGS)) {
    const color = sb.color.trim();
    const sp = parseProductUrl(sb.url);
    if (!sp.ok) {
      errors.push(`다른 색상 "${color || sb.url}": 무신사 상품 주소가 아닙니다.`);
      continue;
    }
    if (listings.some((l) => l.externalId === sp.externalId)) {
      errors.push(`다른 색상 "${color}": 이미 목록에 있는 페이지입니다.`);
      continue;
    }
    if (!color || color.length > 30) {
      errors.push(`다른 색상 (${sp.externalId}): 색상 이름을 1~30자로 입력해 주세요.`);
      continue;
    }
    const { sizes, error } = parseSizes(sb.sizes);
    if (error) {
      errors.push(`다른 색상 "${color}": ${error}`);
      continue;
    }
    listings.push({
      platform: sp.platform,
      externalId: sp.externalId,
      url: sp.canonicalUrl,
      variants: sizes.length
        ? sizes.map((size) => ({ color, size, label: `${color} / ${size}` }))
        : [{ color, size: "", label: color }],
    });
  }

  if (errors.length > 0 || !parsed.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      brand,
      name,
      modelNo: modelNo || null,
      category: category || null,
      listings,
    },
  };
}
