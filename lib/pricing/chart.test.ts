import { describe, expect, it } from "vitest";
import { buildChartSeries } from "./chart";
import { makeHistory } from "./__fixtures__/history";
import type { PriceSnapshot } from "./types";

const NOW = new Date("2026-11-18T03:00:00Z");

describe("buildChartSeries", () => {
  it("기록 없음 → 빈 배열", () => {
    expect(buildChartSeries([])).toEqual([]);
  });

  it("꾸준한 수집 → 공백 지점 없음, 기록 수 그대로", () => {
    const h = makeHistory({ now: NOW, days: 10, listPrice: 50000, basePrice: 40000 });
    const s = buildChartSeries(h.snapshots);
    expect(s).toHaveLength(h.snapshots.length);
    expect(s.every((p) => p.sale !== null)).toBe(true);
  });

  it("15일 공백 → null 지점 1개로 선을 끊고, 가격을 만들어 넣지 않음", () => {
    const h = makeHistory({
      now: NOW, days: 50, listPrice: 99000, basePrice: 79000, gap: { from: 34, to: 20 },
    });
    const s = buildChartSeries(h.snapshots);
    const nulls = s.filter((p) => p.sale === null);
    expect(nulls).toHaveLength(1);
    expect(s.filter((p) => p.sale !== null)).toHaveLength(h.snapshots.length);
  });

  it("무효 기록은 제외, 품절은 표시", () => {
    const h = makeHistory({
      now: NOW, days: 5, listPrice: 50000, basePrice: 40000, soldOut: { from: 2, to: 2 },
    });
    const voided: PriceSnapshot = { ...h.snapshots[0], collectedAt: new Date(NOW.getTime() - 3600_000), salePrice: 1, isVoid: true };
    const s = buildChartSeries([...h.snapshots, voided]);
    expect(s.some((p) => p.sale === 1)).toBe(false);
    expect(s.filter((p) => p.soldOut)).toHaveLength(2);
  });

  it("입력 순서와 관계없이 시간순 정렬", () => {
    const h = makeHistory({ now: NOW, days: 3, listPrice: 50000, basePrice: 40000 });
    const s = buildChartSeries([...h.snapshots].reverse());
    const ts = s.map((p) => p.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });
});
