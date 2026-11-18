// 그래프용 데이터 변환 (순수 함수).
// 수집 간격이 크게 벌어진 곳에는 값이 null 인 지점을 넣어 선을 끊는다.
// 이 null 지점은 화면 표시용이며 DB 에 저장하지 않는다. 가격을 보간하지 않는다.

import type { PriceSnapshot, PriceSource, StockStatus } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export interface ChartPoint {
  /** epoch ms */
  t: number;
  sale: number | null;
  list: number | null;
  soldOut: boolean;
  source: PriceSource | null;
}

export interface ChartOptions {
  /** 이 시간보다 짧은 간격은 공백으로 보지 않는다 */
  minGapHours?: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * 공백 기준: max(minGapHours, 수집 간격 중앙값 × 2).
 * 하루 2회 수집이면 중앙값 12시간 → 36시간(기본 최소값)보다 벌어지면 공백.
 */
export function buildChartSeries(
  snapshots: readonly PriceSnapshot[],
  options: ChartOptions = {},
): ChartPoint[] {
  const valid = snapshots
    .filter((s) => !s.isVoid)
    .sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime());
  if (valid.length === 0) return [];

  const intervals: number[] = [];
  for (let i = 1; i < valid.length; i++) {
    intervals.push(valid[i].collectedAt.getTime() - valid[i - 1].collectedAt.getTime());
  }
  const minGap = (options.minGapHours ?? 36) * HOUR_MS;
  const gapThreshold = intervals.length > 0 ? Math.max(minGap, median(intervals) * 2) : minGap;

  const points: ChartPoint[] = [];
  valid.forEach((s, i) => {
    const t = s.collectedAt.getTime();
    if (i > 0) {
      const prev = valid[i - 1].collectedAt.getTime();
      if (t - prev > gapThreshold) {
        points.push({ t: Math.round((prev + t) / 2), sale: null, list: null, soldOut: false, source: null });
      }
    }
    points.push({
      t,
      sale: s.salePrice,
      list: s.listPrice,
      soldOut: s.stockStatus === ("sold_out" satisfies StockStatus),
      source: s.source,
    });
  });
  return points;
}
