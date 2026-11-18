import { describe, expect, it } from "vitest";
import { buildCheckList, type CheckTarget } from "./checklist";

const NOW = new Date("2026-11-18T03:00:00Z"); // KST 11-18 12:00
const t = (listingId: number, lastSuccessAt: string | null): CheckTarget => ({
  listingId,
  productId: 1,
  brandName: "B",
  productName: "P",
  platformName: "무신사",
  color: "Black",
  url: `https://www.musinsa.com/products/${listingId}`,
  lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt) : null,
});

describe("buildCheckList", () => {
  it("오늘(KST) 기록한 판매처는 제외, 기록 없음 → 오래된 순", () => {
    const r = buildCheckList(
      [
        t(1, "2026-11-17T15:30:00Z"), // KST 11-18 00:30 → 오늘
        t(2, "2026-11-17T14:59:00Z"), // KST 11-17 23:59 → 어제
        t(3, null),
        t(4, "2026-11-10T00:00:00Z"),
        t(5, null),
      ],
      NOW,
    );
    expect(r.due.map((x) => x.listingId)).toEqual([3, 5, 4, 2]);
    expect(r.doneToday).toBe(1);
  });

  it("대상이 없으면 빈 목록", () => {
    expect(buildCheckList([], NOW)).toEqual({ due: [], doneToday: 0 });
  });
});
