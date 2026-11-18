"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validateProductForm, type ProductFormValues } from "@/lib/forms/product";
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

export async function registerProductAction(_prev: RegisterState, fd: FormData): Promise<RegisterState> {
  await requireAdmin("/products/new");

  const values: ProductFormValues = {
    url: field(fd, "url"),
    brand: field(fd, "brand"),
    name: field(fd, "name"),
    modelNo: field(fd, "modelNo"),
    category: field(fd, "category"),
    options: field(fd, "options"),
  };
  const result = validateProductForm(values);
  if (!result.ok) return { errors: result.errors, values, existingProductId: null };
  const v = result.value;

  // 같은 상품 URL(플랫폼 + 상품 번호)이 이미 있으면 그 상품으로 안내
  const read = createReadClient();
  const { data: existing } = await read
    .from("listings")
    .select("product_id, platforms!inner ( code )")
    .eq("platforms.code", v.platform)
    .eq("external_id", v.externalId)
    .maybeSingle();
  if (existing) {
    return { errors: ["이미 등록된 상품입니다."], values, existingProductId: existing.product_id };
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("register_product", {
    p_platform_code: v.platform,
    p_external_id: v.externalId,
    p_url: v.url,
    p_brand_name: v.brand,
    p_product_name: v.name,
    p_model_no: v.modelNo ?? "",
    p_category: v.category ?? "",
    p_variants: v.variants as unknown as Json,
  });
  if (error) {
    const message = /duplicate key/.test(error.message)
      ? "이미 등록된 상품이거나 옵션 이름이 중복되었습니다."
      : `저장하지 못했습니다: ${error.message}`;
    return { errors: [message], values, existingProductId: null };
  }

  const productId = (data as { product_id: number }).product_id;
  redirect(`/products/${productId}/prices/new?registered=1`);
}
