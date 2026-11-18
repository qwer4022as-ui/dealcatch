"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validateProductForm, type ProductFormValues, type SiblingFormValues } from "@/lib/forms/product";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createReadClient } from "@/lib/supabase/server";

export interface RegisterState {
  errors: string[];
  values: ProductFormValues;
  /** 이미 등록된 상품이면 그 상품 id */
  existingProductId: number | null;
}

const field = (fd: FormData, key: string) => String(fd.get(key) ?? "");

function readSiblings(fd: FormData): SiblingFormValues[] {
  const count = Math.min(Number(fd.get("sib_count")) || 0, 20);
  return Array.from({ length: count }, (_, i) => ({
    on: fd.get(`sib_${i}_on`) === "on",
    url: field(fd, `sib_${i}_url`),
    color: field(fd, `sib_${i}_color`),
    sizes: field(fd, `sib_${i}_sizes`),
    note: field(fd, `sib_${i}_note`),
  }));
}

export async function registerProductAction(_prev: RegisterState, fd: FormData): Promise<RegisterState> {
  await requireAdmin("/products/new");

  const values: ProductFormValues = {
    url: field(fd, "url"),
    brand: field(fd, "brand"),
    name: field(fd, "name"),
    modelNo: field(fd, "modelNo"),
    category: field(fd, "category"),
    options: field(fd, "options"),
    siblings: readSiblings(fd),
  };
  const result = validateProductForm(values);
  if (!result.ok) return { errors: result.errors, values, existingProductId: null };
  const v = result.value;
  const [main, ...others] = v.listings;

  // 이미 등록된 페이지가 있으면 안내 (현재 페이지 → 그 상품으로, 다른 색상 → 체크 해제 안내)
  const { data: existing, error: readError } = await createReadClient()
    .from("listings")
    .select("product_id, external_id, platforms!inner ( code )")
    .eq("platforms.code", "musinsa")
    .in("external_id", v.listings.map((l) => l.externalId));
  if (readError) return { errors: [`등록 여부를 확인하지 못했습니다: ${readError.message}`], values, existingProductId: null };
  const mainExisting = existing.find((e) => e.external_id === main.externalId);
  if (mainExisting) {
    return { errors: ["이미 등록된 상품입니다."], values, existingProductId: mainExisting.product_id };
  }
  const dupOthers = others.filter((o) => existing.some((e) => e.external_id === o.externalId));
  if (dupOthers.length > 0) {
    const names = dupOthers.map((o) => o.variants[0]?.color || o.externalId).join(", ");
    return {
      errors: [`다른 색상 중 이미 등록된 페이지가 있습니다: ${names}. 체크를 해제하고 다시 등록해 주세요.`],
      values,
      existingProductId: null,
    };
  }

  const { data, error } = await createAdminClient().rpc("register_product_listings", {
    p_brand_name: v.brand,
    p_product_name: v.name,
    p_model_no: v.modelNo ?? "",
    p_category: v.category ?? "",
    p_listings: v.listings.map((l) => ({
      platform_code: l.platform,
      external_id: l.externalId,
      url: l.url,
      variants: l.variants,
    })) as unknown as Json,
  });
  if (error) {
    const message = /duplicate key/.test(error.message)
      ? "이미 등록된 상품이거나 옵션 이름이 중복되었습니다."
      : `저장하지 못했습니다: ${error.message}`;
    return { errors: [message], values, existingProductId: null };
  }

  const { product_id, listing_ids } = data as { product_id: number; listing_ids: number[] };
  redirect(`/products/${product_id}/prices/new?listing=${listing_ids[0]}&registered=${listing_ids.length}`);
}
