import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// price_alerts 는 브라우저 키로 읽을 수 없으므로 서버(service role)에서만 읽고 쓴다.
// 호출하는 쪽에서 반드시 관리자 확인(isAdmin / requireAdmin)을 먼저 한다.

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what} 실패: ${error.message}`);
}

export async function getTargets(): Promise<Map<number, number>> {
  const { data, error } = await createAdminClient().from("price_alerts").select("product_id, target_price");
  if (error) fail("목표가 조회", error);
  return new Map(data.filter((r) => r.target_price !== null).map((r) => [r.product_id, r.target_price as number]));
}

export async function getTarget(productId: number): Promise<number | null> {
  const { data, error } = await createAdminClient()
    .from("price_alerts")
    .select("target_price")
    .eq("product_id", productId)
    .maybeSingle();
  if (error) fail("목표가 조회", error);
  return data?.target_price ?? null;
}

/** null 이면 목표가 삭제 */
export async function setTarget(productId: number, target: number | null): Promise<void> {
  const db = createAdminClient();
  const { error } =
    target === null
      ? await db.from("price_alerts").delete().eq("product_id", productId)
      : await db
          .from("price_alerts")
          .upsert({ product_id: productId, target_price: target, updated_at: new Date().toISOString() });
  if (error) fail("목표가 저장", error);
}
