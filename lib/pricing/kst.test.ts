import { describe, expect, it } from "vitest";
import { kstDateKey, kstStartOfDay } from "./kst";

describe("kstDateKey", () => {
  it("UTC 15:00 은 KST 다음 날 00:00", () => {
    expect(kstDateKey(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-18");
  });

  it("UTC 14:59:59 는 KST 같은 날 23:59:59", () => {
    expect(kstDateKey(new Date("2026-11-17T14:59:59Z"))).toBe("2026-11-17");
  });

  it("연말 경계", () => {
    expect(kstDateKey(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});

describe("kstStartOfDay", () => {
  const now = new Date("2026-11-18T03:00:00Z"); // KST 11-18 12:00

  it("오늘 KST 자정", () => {
    expect(kstStartOfDay(now).toISOString()).toBe("2026-11-17T15:00:00.000Z");
  });

  it("29일 전 KST 자정 (30일 기간의 시작)", () => {
    expect(kstStartOfDay(now, 29).toISOString()).toBe("2026-10-19T15:00:00.000Z");
  });

  it("KST 자정 직후 기준", () => {
    const justAfter = new Date("2026-11-17T15:00:01Z");
    expect(kstStartOfDay(justAfter).toISOString()).toBe("2026-11-17T15:00:00.000Z");
  });
});
