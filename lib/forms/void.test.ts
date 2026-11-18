import { describe, expect, it } from "vitest";
import { validateVoidReason } from "./void";

describe("validateVoidReason", () => {
  it("공백 정리 후 2~200자", () => {
    expect(validateVoidReason("  판매가   오타 \n")).toEqual({ ok: true, reason: "판매가 오타" });
    expect(validateVoidReason(" a ").ok).toBe(false);
    expect(validateVoidReason("가".repeat(201)).ok).toBe(false);
  });
});
