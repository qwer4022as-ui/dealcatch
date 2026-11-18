import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * 쓰기 클라이언트 (service role, RLS 우회).
 * 반드시 requireAdmin() 을 통과한 서버 액션 안에서만 만든다. 클라이언트 컴포넌트에서 import 하면 빌드가 실패한다.
 */
export function createAdminClient() {
  const { supabaseUrl } = getServerEnv();
  return createClient<Database>(supabaseUrl, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
