import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminToken } from "@/lib/env";
import { SESSION_TTL_MS, safeEqual, signSession, verifySession } from "./session";

export const ADMIN_COOKIE = "admin_session";

/** 현재 요청이 관리자 세션을 가졌는지. 쿠키를 읽으므로 <Suspense> 안에서 호출한다. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  let secret: string;
  try {
    secret = getAdminToken();
  } catch {
    return false; // 설정 누락은 로그인 시도 때 안내한다 (화면 전체가 멈추지 않게)
  }
  return verifySession(secret, store.get(ADMIN_COOKIE)?.value, Date.now());
}

/** 관리자 전용 화면·서버 액션 첫 줄에서 호출. 아니면 로그인 화면으로 보낸다. */
export async function requireAdmin(nextPath = "/"): Promise<void> {
  if (!(await isAdmin())) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

/** 입력한 토큰이 맞으면 세션 쿠키를 발급하고 true */
export async function startAdminSession(inputToken: string): Promise<boolean> {
  const secret = getAdminToken();
  if (!safeEqual(inputToken, secret)) return false;
  const store = await cookies();
  store.set(ADMIN_COOKIE, signSession(secret, Date.now() + SESSION_TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return true;
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
