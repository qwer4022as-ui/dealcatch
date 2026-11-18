import { describe, expect, it } from "vitest";
import { formatKRW } from "@/lib/format";

describe("formatKRW", () => {
  it("천 단위 쉼표와 '원'을 붙인다", () => {
    expect(formatKRW(89000)).toBe("89,000원");
    expect(formatKRW(1290000)).toBe("1,290,000원");
  });

  it("0과 세 자리 이하 금액", () => {
    expect(formatKRW(0)).toBe("0원");
    expect(formatKRW(500)).toBe("500원");
  });

  it("정수가 아니면 오류를 낸다", () => {
    expect(() => formatKRW(89000.5)).toThrow(TypeError);
  });
});
