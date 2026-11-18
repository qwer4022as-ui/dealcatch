import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * 읽기 전용 클라이언트 (anon 키 + RLS 공개 읽기 정책).
 * 쓰기용 service role 클라이언트는 쓰기 기능을 만들 때 별도로 추가한다.
 */
export function createReadClient() {
  const { supabaseUrl, supabaseAnonKey } = getServerEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
