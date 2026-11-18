import { describe, expect, it } from "vitest";
import { formatAgo, formatKRW, formatKstDate, formatKstDateTime, formatKstMonthDay, formatSignedPct } from "@/lib/format";

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

describe("KST 날짜 표시", () => {
  const at = new Date("2026-11-17T15:30:00Z"); // KST 11-18 00:30
  it("날짜·시각은 KST", () => {
    expect(formatKstDateTime(at)).toBe("2026-11-18 00:30");
    expect(formatKstDate(at)).toBe("2026-11-18");
    expect(formatKstMonthDay(at.getTime())).toBe("11-18");
  });
});

describe("formatSignedPct", () => {
  it("부호와 소수 첫째 자리", () => {
    expect(formatSignedPct(8.4)).toBe("+8.4%");
    expect(formatSignedPct(-3)).toBe("−3.0%");
    expect(formatSignedPct(0)).toBe("0%");
  });
});

describe("formatAgo", () => {
  const now = new Date("2026-11-18T03:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it("경과 시간", () => {
    expect(formatAgo(ago(30_000), now)).toBe("방금 전");
    expect(formatAgo(ago(5 * 60_000), now)).toBe("5분 전");
    expect(formatAgo(ago(3 * 3600_000), now)).toBe("3시간 전");
    expect(formatAgo(ago(63 * 3600_000), now)).toBe("2일 전");
  });
});
