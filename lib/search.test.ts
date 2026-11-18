import { describe, expect, it } from "vitest";
import { sanitizeQuery } from "./search";

describe("sanitizeQuery", () => {
  it("한글·영문·하이픈은 유지", () => {
    expect(sanitizeQuery("  울 코트 ")).toBe("울 코트");
    expect(sanitizeQuery("SMP-COAT-01")).toBe("SMP-COAT-01");
  });
  it("필터 문법 문자는 제거 (쿼리 주입 방지)", () => {
    expect(sanitizeQuery("a,name.eq.x")).toBe("a name eq x");
    expect(sanitizeQuery("%(*)")).toBe("");
  });
  it("50자 제한", () => {
    expect(sanitizeQuery("가".repeat(80))).toHaveLength(50);
  });
});
