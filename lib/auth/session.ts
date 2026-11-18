// 관리자 세션 서명·검증 (순수 함수, Node crypto 사용).
// 쿠키에는 ADMIN_TOKEN 원문을 넣지 않고 "만료시각.서명" 만 저장한다.
// ADMIN_TOKEN 을 바꾸면 기존 세션은 모두 무효가 된다.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hmac(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** 길이가 달라도 시간 차이로 내용을 추측할 수 없게 해시 후 비교 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function signSession(secret: string, expiresAtMs: number): string {
  const payload = `v1.${expiresAtMs}`;
  return `${payload}.${hmac(secret, payload)}`;
}

export function verifySession(secret: string, token: string | undefined, nowMs: number): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowMs) return false;
  return safeEqual(parts[2], hmac(secret, `v1.${parts[1]}`));
}

/** 로그인 후 돌아갈 경로. 외부 주소로의 이동(오픈 리다이렉트)을 막는다 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  return next;
}
