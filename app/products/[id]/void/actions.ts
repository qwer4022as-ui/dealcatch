"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validateVoidReason } from "@/lib/forms/void";
import { createAdminClient } from "@/lib/supabase/admin";

export interface VoidState {
  error: string | null;
}

/** 가격 기록 1건을 무효 처리한다. 샘플 기록과 이미 무효인 기록은 대상이 아니다. */
export async function voidSnapshotAction(
  ctx: { productId: number; listingVariantId: number; snapshotId: number },
  _prev: VoidState,
  fd: FormData,
): Promise<VoidState> {
  await requireAdmin(`/products/${ctx.productId}`);

  const checked = validateVoidReason(String(fd.get("reason") ?? ""));
  if (!checked.ok) return { error: checked.error };

  const db = createAdminClient();
  // 기록이 이 상품의 이 옵션에 속하는지 DB 에서 확인 (화면에서 보낸 id 를 그대로 믿지 않음)
  const { data: snap, error: readError } = await db
    .from("price_snapshots")
    .select("id, source, is_void, listing_variant_id, listing_variants!inner ( listings!inner ( product_id ) )")
    .eq("id", ctx.snapshotId)
    .maybeSingle();
  if (readError) return { error: `기록을 확인하지 못했습니다: ${readError.message}` };
  if (
    !snap ||
    snap.listing_variant_id !== ctx.listingVariantId ||
    snap.listing_variants.listings.product_id !== ctx.productId
  ) {
    return { error: "해당 기록을 찾을 수 없습니다." };
  }
  if (snap.source === "sample") return { error: "샘플 기록은 무효 처리할 수 없습니다." };
  if (snap.is_void) return { error: "이미 무효 처리된 기록입니다." };

  const { error } = await db
    .from("price_snapshots")
    .update({ is_void: true, void_reason: checked.reason })
    .eq("id", ctx.snapshotId)
    .eq("is_void", false);
  if (error) return { error: `무효 처리하지 못했습니다: ${error.message}` };

  redirect(`/products/${ctx.productId}?variant=${ctx.listingVariantId}`);
}
