import { describe, expect, it } from "vitest";
import { computePriceStats } from "./stats";
import { makeHistory } from "./__fixtures__/history";
import { DEFAULT_PRICING_CONFIG, type PriceSnapshot, type WindowStat } from "./types";

// 기준 시각: KST 2026-11-18 12:00 → 오늘 09:00 수집은 있고 21:00 은 아직 없음
const NOW = new Date("2026-11-18T03:00:00Z");
const HOUR = 60 * 60 * 1000;

const snap = (over: Partial<PriceSnapshot> & { collectedAt: Date }): PriceSnapshot => ({
  salePrice: 10000,
  listPrice: 20000,
  stockStatus: "in_stock",
  source: "manual",
  isVoid: false,
  ...over,
});
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR);

function expectOk(w: WindowStat) {
  if (w.kind !== "ok") throw new Error(`기간 통계가 ok 가 아님: ${JSON.stringify(w)}`);
  return w;
}
function expectInsufficient(w: WindowStat) {
  if (w.kind !== "insufficient") throw new Error(`데이터 부족이어야 함: ${JSON.stringify(w)}`);
  return w;
}

describe("샘플 시나리오 (supabase/seed/sample.sql 과 동일 조건)", () => {
  it("1 울 코트: 130일 수집, 할인 2회 → 현재가·최저가·30/90일 최저가", () => {
    const h = makeHistory({
      now: NOW, days: 130, listPrice: 189000, basePrice: 159000,
      discounts: [
        { from: 100, to: 90, price: 129000 },
        { from: 25, to: 18, price: 119000 },
        { from: 3, to: 0, price: 129000 },
      ],
    });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);

    expect(s.current?.salePrice).toBe(129000);
    expect(s.current?.discountRatePct).toBe(31.7);
    expect(s.periodLow?.price).toBe(119000);
    expect(s.periodLow?.currentVsLowPct).toBe(8.4);
    // 같은 최저가가 여러 번이면 가장 최근(18일 전 21:00 KST)
    expect(s.periodLow?.at.toISOString()).toBe("2026-10-31T12:00:00.000Z");

    const w30 = expectOk(s.window30);
    expect(w30.low.price).toBe(119000);
    expect(w30.coverage).toBe(1);
    // 100~90일 전 할인(129,000)은 90일 기간 밖 → 90일 최저도 119,000
    expect(expectOk(s.window90).low.price).toBe(119000);

    expect(s.health).toBe("ok");
    expect(s.hasSample).toBe(true);
  });

  it("1 울 코트 L: 옵션 추가금이 가격에 반영됨", () => {
    const h = makeHistory({
      now: NOW, days: 130, listPrice: 189000, basePrice: 159000, extra: 5000,
      discounts: [{ from: 3, to: 0, price: 129000 }],
    });
    expect(computePriceStats(h.snapshots, h.attempts, NOW).current?.salePrice).toBe(134000);
  });

  it("2 램스울 니트: 20일 수집 → 30/90일 데이터 부족(too_short)", () => {
    const h = makeHistory({ now: NOW, days: 20, listPrice: 79000, basePrice: 59000 });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);

    const w30 = expectInsufficient(s.window30);
    expect(w30.reason).toBe("too_short");
    expect(w30.collectedDays).toBe(21);
    expect(expectInsufficient(s.window90).reason).toBe("too_short");
    // 수집 기간 최저가는 기록이 있으면 표시
    expect(s.periodLow?.price).toBe(59000);
  });

  it("3 와이드 데님: 20~34일 전 공백 → 30일 커버리지 미달", () => {
    const h = makeHistory({
      now: NOW, days: 50, listPrice: 99000, basePrice: 79000,
      gap: { from: 34, to: 20 },
    });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);

    const w30 = expectInsufficient(s.window30);
    expect(w30.reason).toBe("low_coverage");
    expect(w30.collectedDays).toBe(20);
    expect(w30.coverage).toBe(0.667);
    expect(expectInsufficient(s.window90).reason).toBe("too_short");
    // 공백 구간에 기록을 만들어 넣지 않는다
    expect(s.collectedDays).toBe(51 - 15);
  });

  it("4 옥스포드 셔츠: 최근 3회 연속 실패 → 수집 실패, 현재가는 마지막 성공가", () => {
    const h = makeHistory({ now: NOW, days: 60, listPrice: 69000, basePrice: 49000, failLast: 3 });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);

    expect(s.health).toBe("failing");
    expect(s.consecutiveFailures).toBe(3);
    expect(s.current?.salePrice).toBe(49000);
    // 마지막 성공: 2일 전 21:00 KST
    expect(s.lastSuccessAt?.toISOString()).toBe("2026-11-16T12:00:00.000Z");
  });

  it("5 캔버스 스니커즈: 3일 전부터 수집 없음 → 오래됨", () => {
    const h = makeHistory({ now: NOW, days: 40, listPrice: 89000, basePrice: 69000, stopDays: 3 });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);
    expect(s.health).toBe("stale");
    expect(s.consecutiveFailures).toBe(0);
  });

  describe("6 집업 후드: 10~15일 전 품절(최저가), 무효 기록 1건", () => {
    const h = makeHistory({
      now: NOW, days: 100, listPrice: 89000, basePrice: 65000,
      discounts: [{ from: 15, to: 10, price: 45000 }],
      soldOut: { from: 15, to: 10 },
    });
    const voided = snap({
      collectedAt: hoursAgo(24 * 7), salePrice: 9900, listPrice: 89000, source: "sample", isVoid: true,
    });
    const snapshots = [...h.snapshots, voided];

    it("기본: 무효·품절 기록 제외 → 최저가 65,000", () => {
      const s = computePriceStats(snapshots, h.attempts, NOW);
      expect(s.periodLow?.price).toBe(65000);
      expect(expectOk(s.window30).low.price).toBe(65000);
      expect(s.recordCount).toBe(h.snapshots.length);
    });

    it("품절 포함 설정 → 최저가 45,000 (무효 9,900 은 여전히 제외)", () => {
      const s = computePriceStats(snapshots, h.attempts, NOW, {
        ...DEFAULT_PRICING_CONFIG,
        excludeSoldOut: false,
      });
      expect(s.periodLow?.price).toBe(45000);
    });
  });
});

describe("경계·예외 상황", () => {
  it("기록 없음 → 모든 값 없음, 데이터 부족(no_data)", () => {
    const s = computePriceStats([], [], NOW);
    expect(s.current).toBeNull();
    expect(s.periodLow).toBeNull();
    expect(expectInsufficient(s.window30).reason).toBe("no_data");
    expect(expectInsufficient(s.window90).reason).toBe("no_data");
    expect(s.health).toBe("no_data");
    expect(s.recordCount).toBe(0);
    expect(s.hasSample).toBe(false);
  });

  it("기록 없이 실패만 있음 → 수집 실패", () => {
    const s = computePriceStats([], [{ attemptedAt: hoursAgo(1), outcome: "blocked" }], NOW);
    expect(s.health).toBe("failing");
    expect(s.consecutiveFailures).toBe(1);
  });

  it("기록 1건 → 현재가·수집 기간 최저가만, 기간 최저가는 데이터 부족", () => {
    const s = computePriceStats([snap({ collectedAt: hoursAgo(1) })], [], NOW);
    expect(s.current?.salePrice).toBe(10000);
    expect(s.periodLow?.price).toBe(10000);
    expect(s.periodLow?.currentVsLowPct).toBe(0);
    expect(expectInsufficient(s.window30).reason).toBe("too_short");
    expect(s.health).toBe("ok");
  });

  it("수동 입력처럼 시도 기록이 없어도 마지막 성공 시각은 기록 시각", () => {
    const at = hoursAgo(5);
    const s = computePriceStats([snap({ collectedAt: at })], [], NOW);
    expect(s.lastSuccessAt).toEqual(at);
  });

  it("오래됨 기준: 정확히 24시간 전은 정상, 그보다 오래되면 오래됨", () => {
    expect(computePriceStats([snap({ collectedAt: hoursAgo(24) })], [], NOW).health).toBe("ok");
    const older = new Date(NOW.getTime() - 24 * HOUR - 1);
    expect(computePriceStats([snap({ collectedAt: older })], [], NOW).health).toBe("stale");
  });

  it("실패 후 다시 성공하면 연속 실패 0", () => {
    const s = computePriceStats(
      [snap({ collectedAt: hoursAgo(1) })],
      [
        { attemptedAt: hoursAgo(13), outcome: "timeout" },
        { attemptedAt: hoursAgo(1), outcome: "success" },
      ],
      NOW,
    );
    expect(s.consecutiveFailures).toBe(0);
    expect(s.health).toBe("ok");
  });

  it("가장 최근 기록이 무효면 그 이전 기록이 현재가", () => {
    const s = computePriceStats(
      [
        snap({ collectedAt: hoursAgo(12), salePrice: 30000, listPrice: 40000 }),
        snap({ collectedAt: hoursAgo(1), salePrice: 300, listPrice: 40000, isVoid: true }),
      ],
      [],
      NOW,
    );
    expect(s.current?.salePrice).toBe(30000);
    expect(s.periodLow?.price).toBe(30000);
  });

  it("기준 시각보다 미래의 기록은 무시", () => {
    const s = computePriceStats(
      [snap({ collectedAt: hoursAgo(2) }), snap({ collectedAt: hoursAgo(-2), salePrice: 1 })],
      [],
      NOW,
    );
    expect(s.current?.salePrice).toBe(10000);
    expect(s.recordCount).toBe(1);
  });

  it("정가가 없으면 할인율은 null", () => {
    const s = computePriceStats([snap({ collectedAt: hoursAgo(1), listPrice: null })], [], NOW);
    expect(s.current?.discountRatePct).toBeNull();
  });

  it("기간 시작 시각(KST 자정)에 기록된 가격은 기간에 포함", () => {
    const h = makeHistory({ now: NOW, days: 40, listPrice: 50000, basePrice: 40000 });
    const startOf30 = new Date("2026-10-19T15:00:00Z"); // 29일 전 KST 00:00
    const atStart = snap({ collectedAt: startOf30, salePrice: 1000, listPrice: 50000, source: "sample" });
    const s = computePriceStats([...h.snapshots, atStart], h.attempts, NOW);
    expect(expectOk(s.window30).low.price).toBe(1000);

    const beforeStart = snap({
      collectedAt: new Date(startOf30.getTime() - 1), salePrice: 1000, listPrice: 50000, source: "sample",
    });
    const s2 = computePriceStats([...h.snapshots, beforeStart], h.attempts, NOW);
    expect(expectOk(s2.window30).low.price).toBe(40000);
  });

  it("기간 내 기록이 전부 품절이면 커버리지와 무관하게 데이터 부족(no_data)", () => {
    const h = makeHistory({
      now: NOW, days: 40, listPrice: 50000, basePrice: 40000, soldOut: { from: 40, to: 0 },
    });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);
    expect(s.current?.stockStatus).toBe("sold_out");
    expect(s.periodLow).toBeNull();
    expect(expectInsufficient(s.window30).reason).toBe("no_data");
  });

  it("커버리지 기준 경계: 70% 이상이면 표시", () => {
    // 최근 30일 중 21일(70%) 수집, 31일 이전부터 기록 존재
    const h = makeHistory({
      now: NOW, days: 40, listPrice: 50000, basePrice: 40000, gap: { from: 29, to: 21 },
    });
    const s = computePriceStats(h.snapshots, h.attempts, NOW);
    const w30 = expectOk(s.window30);
    expect(w30.coverage).toBe(0.7);
  });
});
