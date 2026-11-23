import { describe, expect, it } from "vitest";
import { averagePct, changePct, dailyLowSeries } from "./trend";

// 2026-11-23 12:00 KST
const NOW = new Date("2026-11-23T03:00:00Z");
const kst = (day: number, hour = 12) => new Date(Date.UTC(2026, 10, day, hour - 9));

describe("dailyLowSeries", () => {
  it("하루 최저가(품절 제외), 기록 없는 날은 null, 범위 밖은 무시", () => {
    const s = dailyLowSeries(
      [
        { listingId: 1, collectedAt: kst(23), salePrice: 9000, soldOut: false },
        { listingId: 1, collectedAt: kst(23, 20), salePrice: 8000, soldOut: true },
        { listingId: 1, collectedAt: kst(23, 1), salePrice: 9500, soldOut: false },
        { listingId: 1, collectedAt: kst(21), salePrice: 10000, soldOut: false },
        { listingId: 1, collectedAt: kst(-10), salePrice: 1, soldOut: false }, // 10월 21일: 30일 밖
      ],
      NOW,
    ).get(1)!;
    expect(s).toHaveLength(30);
    expect(s.at(-1)).toBe(9000);
    expect(s.at(-2)).toBeNull();
    expect(s.at(-3)).toBe(10000);
    expect(s.filter((v) => v !== null)).toHaveLength(2);
  });

  it("KST 자정 경계: 00:30 KST 는 그날로 센다", () => {
    const s = dailyLowSeries([{ listingId: 2, collectedAt: new Date("2026-11-22T15:30:00Z"), salePrice: 5000, soldOut: false }], NOW).get(2)!;
    expect(s.at(-1)).toBe(5000);
  });
});

describe("changePct", () => {
  const series = (entries: Record<number, number>) => {
    const s: (number | null)[] = Array(30).fill(null);
    for (const [i, v] of Object.entries(entries)) s[Number(i)] = v;
    return s;
  };
  it("7일 이상 앞선 가장 가까운 기록과 비교", () => {
    expect(changePct(series({ 10: 12000, 20: 10000, 29: 9000 }))).toBe(-10);
  });
  it("7일 전 기록이 없으면 null (추정하지 않음)", () => {
    expect(changePct(series({ 25: 10000, 29: 9000 }))).toBeNull();
    expect(changePct(series({}))).toBeNull();
  });
  it("변동 없음은 0", () => {
    expect(changePct(series({ 0: 5000, 29: 5000 }))).toBe(0);
  });
});

describe("averagePct", () => {
  it("null 은 빼고 평균", () => {
    expect(averagePct([-10, null, 2])).toBe(-4);
    expect(averagePct([null])).toBeNull();
  });
});
