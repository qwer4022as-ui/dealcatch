"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validatePriceForm, type PriceRowInput } from "@/lib/forms/prices";
import { getProductDetail } from "@/lib/repositories/product-detail";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PriceFormState {
  errors: string[];
  bigChanges: string[];
  /** 다시 그릴 때 유지할 입력값 (name → value) */
  values: Record<string, string>;
}

export async function recordPricesAction(
  ctx: { productId: number; listingId: number; returnToDashboard?: boolean },
  _prev: PriceFormState,
  fd: FormData,
): Promise<PriceFormState> {
  await requireAdmin(`/products/${ctx.productId}/prices/new`);

  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") values[k] = v;

  // 옵션 목록과 직전 가격은 클라이언트 값이 아니라 DB 에서 다시 읽는다
  const product = await getProductDetail(ctx.productId);
  const variants = product?.variants.filter((v) => v.listingId === ctx.listingId) ?? [];
  if (!product || variants.length === 0) {
    return { errors: ["상품 또는 판매처를 찾을 수 없습니다."], bigChanges: [], values };
  }
  if (product.isSample) {
    return { errors: ["샘플 상품에는 가격을 입력할 수 없습니다."], bigChanges: [], values };
  }

  const rows: PriceRowInput[] = variants.map((v) => ({
    listingVariantId: v.listingVariantId,
    label: v.optionLabel,
    listPrice: values[`list_${v.listingVariantId}`] ?? "",
    salePrice: values[`sale_${v.listingVariantId}`] ?? "",
    stock: values[`stock_${v.listingVariantId}`] ?? "unknown",
    previousSale: v.latestPrice,
  }));
  const result = validatePriceForm({
    collectedAtLocal: values.collectedAt ?? "",
    rows,
    confirmBigChange: values.confirmBigChange === "on",
    now: new Date(),
  });
  if (!result.ok) return { errors: result.errors, bigChanges: result.bigChanges, values };

  const { error } = await createAdminClient().rpc("record_manual_prices", {
    p_listing_id: ctx.listingId,
    p_collected_at: result.collectedAt.toISOString(),
    p_items: result.items as unknown as Json,
  });
  if (error) {
    const message = /duplicate key/.test(error.message)
      ? "같은 옵션에 같은 시각의 기록이 이미 있습니다. 확인 시각을 바꿔 주세요."
      : `저장하지 못했습니다: ${error.message}`;
    return { errors: [message], bigChanges: [], values };
  }

  if (ctx.returnToDashboard) redirect(`/?recorded=${ctx.listingId}#check`);
  redirect(`/products/${ctx.productId}?variant=${result.items[0].listing_variant_id}`);
}
