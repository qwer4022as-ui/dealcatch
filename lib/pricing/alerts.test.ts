import { describe, expect, it } from "vitest";
import { evaluateAlerts, NEW_LOW_DAYS, recentNewLow, targetHit, type AlertProduct, type AlertVariant } from "./alerts";

const NOW = new Date("2026-11-18T03:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const v = (over: Partial<AlertVariant> = {}): AlertVariant => ({
  label: "Black / M",
  latestPrice: 84900,
  latestStock: "in_stock",
  lowPrice: 79000,
  lowFirstAt: daysAgo(2),
  firstCollectedAt: daysAgo(30),
  ...over,
});
const p = (over: Partial<AlertProduct> = {}): AlertProduct => ({
  productId: 1, name: "윈드브레이커", isSample: false, targetPrice: null, variants: [v()], ...over,
});

describe("targetHit", () => {
  it("판매 중인 옵션 현재가 ≤ 목표가 → 가장 싼 옵션", () => {
    const r = targetHit(p({ targetPrice: 85000, variants: [v({ label: "L", latestPrice: 84000 }), v({ label: "M", latestPrice: 84900 })] }));
    expect(r).toMatchObject({ label: "L", price: 84000, target: 85000 });
  });
  it("목표가와 같으면 도달, 품절 옵션·목표가 없음은 제외", () => {
    expect(targetHit(p({ targetPrice: 84900 }))?.price).toBe(84900);
    expect(targetHit(p({ targetPrice: 90000, variants: [v({ latestStock: "sold_out" })] }))).toBeNull();
    expect(targetHit(p({ targetPrice: null }))).toBeNull();
    expect(targetHit(p({ targetPrice: 80000 }))).toBeNull();
  });
});

describe("recentNewLow", () => {
  it(`최근 ${NEW_LOW_DAYS}일 안에 처음 도달한 최저가 + 이전 기록 존재`, () => {
    expect(recentNewLow(p(), NOW)).toMatchObject({ label: "Black / M", price: 79000 });
  });
  it("첫 기록부터 같은 값이면 갱신 아님 (기록 1건 포함)", () => {
    expect(recentNewLow(p({ variants: [v({ firstCollectedAt: daysAgo(2) })] }), NOW)).toBeNull();
  });
  it(`${NEW_LOW_DAYS}일보다 오래된 갱신은 제외, 경계는 포함`, () => {
    expect(recentNewLow(p({ variants: [v({ lowFirstAt: daysAgo(NEW_LOW_DAYS) })] }), NOW)).not.toBeNull();
    expect(recentNewLow(p({ variants: [v({ lowFirstAt: daysAgo(NEW_LOW_DAYS + 0.01) })] }), NOW)).toBeNull();
  });
  it("여러 옵션이면 가장 최근에 갱신한 옵션", () => {
    const r = recentNewLow(p({ variants: [v({ label: "S", lowFirstAt: daysAgo(5) }), v({ label: "L", lowFirstAt: daysAgo(1) })] }), NOW);
    expect(r?.label).toBe("L");
  });
});

describe("evaluateAlerts", () => {
  it("샘플 상품 제외, 목표가는 목표 대비 비율 순, 갱신은 최근 순", () => {
    const r = evaluateAlerts(
      [
        p({ productId: 1, targetPrice: 100000 }),
        p({ productId: 2, targetPrice: 85000, variants: [v({ lowFirstAt: daysAgo(1) })] }),
        p({ productId: 3, isSample: true, targetPrice: 999999 }),
      ],
      NOW,
    );
    expect(r.targetHits.map((x) => x.productId)).toEqual([1, 2]);
    expect(r.newLows.map((x) => x.productId)).toEqual([2, 1]);
  });
});
