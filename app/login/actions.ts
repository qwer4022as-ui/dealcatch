"use server";

import { redirect } from "next/navigation";
import { endAdminSession, startAdminSession } from "@/lib/auth/admin";
import { safeNextPath } from "@/lib/auth/session";

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const token = String(formData.get("token") ?? "");
  const next = safeNextPath(formData.get("next"));

  let ok: boolean;
  try {
    ok = await startAdminSession(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "서버 설정을 확인해 주세요." };
  }
  if (!ok) {
    await new Promise((r) => setTimeout(r, 500)); // 연속 시도 속도 제한
    return { error: "관리자 토큰이 올바르지 않습니다." };
  }
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/");
}
