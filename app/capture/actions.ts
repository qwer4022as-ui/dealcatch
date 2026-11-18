"use server";

import { isAdmin } from "@/lib/auth/admin";
import { createReadClient } from "@/lib/supabase/server";

export type ResolveResult =
  | { status: "login" }
  | { status: "existing"; productId: number; listingId: number }
  | { status: "new" }
  | { status: "error"; message: string };

/** 무신사 상품 번호로 등록 여부 확인. 조회만 한다 */
export async function resolveCaptureAction(externalId: string): Promise<ResolveResult> {
  if (!(await isAdmin())) return { status: "login" };
  if (!/^\d{1,12}$/.test(externalId)) return { status: "error", message: "상품 번호가 올바르지 않습니다." };

  const { data, error } = await createReadClient()
    .from("listings")
    .select("id, product_id, platforms!inner ( code )")
    .eq("platforms.code", "musinsa")
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) return { status: "error", message: `조회하지 못했습니다: ${error.message}` };
  return data ? { status: "existing", productId: data.product_id, listingId: data.id } : { status: "new" };
}
