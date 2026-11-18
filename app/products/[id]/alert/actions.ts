"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePrice } from "@/lib/forms/prices";
import { getProductDetail } from "@/lib/repositories/product-detail";
import { setTarget } from "@/lib/repositories/alerts";

export interface TargetState {
  error: string | null;
}

/** 목표가 저장. 빈 값이면 삭제 */
export async function setTargetAction(productId: number, _prev: TargetState, fd: FormData): Promise<TargetState> {
  await requireAdmin(`/products/${productId}`);
  const product = await getProductDetail(productId);
  if (!product) return { error: "상품을 찾을 수 없습니다." };
  if (product.isSample) return { error: "샘플 상품에는 알림을 설정할 수 없습니다." };

  const raw = String(fd.get("target") ?? "");
  const target = fd.get("clear") === "1" ? null : parsePrice(raw);
  if (target !== null && (!Number.isSafeInteger(target) || target <= 0 || target > 100_000_000)) {
    return { error: "목표가는 1원 이상의 정수로 입력해 주세요." };
  }
  await setTarget(productId, target);
  redirect(`/products/${productId}`);
}
