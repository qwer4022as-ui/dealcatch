import { describe, expect, it } from "vitest";
import { buildNarrative } from "./narrative";
import { computePriceStats } from "./stats";
import { makeHistory } from "./__fixtures__/history";
import type { PriceSnapshot } from "./types";

const NOW = new Date("2026-11-18T03:00:00Z");
const narrate = (h: ReturnType<typeof makeHistory>) => buildNarrative(computePriceStats(h.snapshots, h.attempts, NOW), NOW);

describe("buildNarrative (샘플 시나리오)", () => {
  it("1 울 코트: 최저가보다 높음, 30·90일 묶음, 할인율, 근거", () => {
    const n = narrate(
      makeHistory({
        now: NOW, days: 130, listPrice: 189000, basePrice: 159000,
        discounts: [{ from: 100, to: 90, price: 129000 }, { from: 25, to: 18, price: 119000 }, { from: 3, to: 0, price: 129000 }],
      }),
    );
    expect(n.sentences).toEqual([
      "현재가 129,000원은 수집 기간 최저가(119,000원, 10월 31일)보다 +8.4% 높습니다.",
      "최근 30일·90일 최저가는 모두 119,000원입니다.",
      "수집한 기록 기준으로 지금은 최저가 수준이 아닙니다.",
      "정가 대비 할인율은 31.7%입니다.",
    ]);
    expect(n.basis).toBe("기록 261건 · 131일 (7월 11일 ~ 11월 18일) · 샘플 데이터");
  });

  it("2 니트 20일: 30·90일 판단 보류, 최저가와 같음", () => {
    const n = narrate(makeHistory({ now: NOW, days: 20, listPrice: 79000, basePrice: 59000, discounts: [{ from: 5, to: 0, price: 57000 }] }));
    expect(n.sentences).toEqual([
      "현재가 57,000원은 수집 기간 최저가와 같습니다.",
      "수집 기간이 21일이라 30일 기준 판단은 아직 이릅니다.",
      "수집 기간이 21일이라 90일 기준 판단은 아직 이릅니다.",
      "수집한 기록 중에서는 지금이 가장 낮은 가격입니다.",
      "정가 대비 할인율은 27.8%입니다.",
    ]);
  });

  it("3 데님: 커버리지 미달은 판단 보류 문장", () => {
    const n = narrate(makeHistory({ now: NOW, days: 50, listPrice: 99000, basePrice: 79000, gap: { from: 34, to: 20 } }));
    expect(n.sentences).toContain("최근 30일 중 20일만 기록되어 30일 기준 판단은 보류합니다.");
  });

  it("5 스니커즈: 오래된 데이터 경고", () => {
    const n = narrate(makeHistory({ now: NOW, days: 40, listPrice: 89000, basePrice: 69000, stopDays: 3 }));
    expect(n.sentences.at(-1)).toBe("마지막 기록이 2일 전이라 지금 가격과 다를 수 있습니다.");
  });

  it("최저가 +5% 이내면 '가까운 가격'", () => {
    const n = narrate(makeHistory({ now: NOW, days: 40, listPrice: 50000, basePrice: 41000, discounts: [{ from: 20, to: 15, price: 40000 }] }));
    expect(n.sentences).toContain("수집 기간 최저가에 가까운 가격입니다 (+5% 이내).");
  });
});

describe("buildNarrative (경계)", () => {
  it("기록 없음 → 요약 불가", () => {
    expect(buildNarrative(computePriceStats([], [], NOW), NOW)).toEqual({
      method: "rule", sentences: ["아직 가격 기록이 없어 요약할 수 없습니다."], basis: null,
    });
  });

  it("기록 1건 → 판단 보류, 수동 입력은 샘플 표시 없음", () => {
    const one: PriceSnapshot = {
      collectedAt: new Date(NOW.getTime() - 3600_000), salePrice: 84900, listPrice: 99900,
      stockStatus: "in_stock", source: "manual", isVoid: false,
    };
    const n = buildNarrative(computePriceStats([one], [], NOW), NOW);
    expect(n.sentences).toContain("기록이 1건뿐이라 가격 수준은 아직 판단할 수 없습니다.");
    expect(n.basis).toBe("기록 1건 · 1일 (11월 18일 ~ 11월 18일)");
  });

  it("문장 속 금액은 모두 통계에 있는 값 (새 숫자를 만들지 않음)", () => {
    const h = makeHistory({ now: NOW, days: 130, listPrice: 189000, basePrice: 159000, discounts: [{ from: 25, to: 18, price: 119000 }] });
    const stats = computePriceStats(h.snapshots, h.attempts, NOW);
    const allowed = new Set(
      [stats.current?.salePrice, stats.periodLow?.price,
        stats.window30.kind === "ok" ? stats.window30.low.price : null,
        stats.window90.kind === "ok" ? stats.window90.low.price : null]
        .filter((x): x is number => typeof x === "number").map((x) => x.toLocaleString("ko-KR")),
    );
    const amounts = buildNarrative(stats, NOW).sentences.join(" ").match(/[\d,]+(?=원)/g) ?? [];
    expect(amounts.length).toBeGreaterThan(0);
    for (const a of amounts) expect(allowed.has(a)).toBe(true);
  });
});
