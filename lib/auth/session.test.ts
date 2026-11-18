import { describe, expect, it } from "vitest";
import { safeEqual, safeNextPath, signSession, verifySession } from "./session";

const SECRET = "test-secret-0123456789abcdef";
const NOW = 1_800_000_000_000;

describe("관리자 세션", () => {
  it("서명한 세션은 만료 전까지 유효", () => {
    const token = signSession(SECRET, NOW + 1000);
    expect(verifySession(SECRET, token, NOW)).toBe(true);
    expect(verifySession(SECRET, token, NOW + 1000)).toBe(false);
  });

  it("쿠키에 비밀 값 원문이 들어가지 않음", () => {
    expect(signSession(SECRET, NOW + 1000)).not.toContain(SECRET);
  });

  it("비밀 값이 바뀌면 기존 세션 무효", () => {
    const token = signSession(SECRET, NOW + 1000);
    expect(verifySession("other-secret-0123456789", token, NOW)).toBe(false);
  });

  it("만료 시각을 조작하면 무효", () => {
    const [v, , sig] = signSession(SECRET, NOW + 1000).split(".");
    expect(verifySession(SECRET, `${v}.${NOW + 10_000_000}.${sig}`, NOW)).toBe(false);
  });

  it("형식이 틀린 값은 무효", () => {
    for (const bad of [undefined, "", "abc", "v1.x.y", "v2.1.2", `v1.${NOW + 1000}`]) {
      expect(verifySession(SECRET, bad, NOW)).toBe(false);
    }
  });
});

describe("safeEqual", () => {
  it("같으면 true, 다르거나 길이가 달라도 false", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("내부 경로만 허용", () => {
    expect(safeNextPath("/products/new")).toBe("/products/new");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
