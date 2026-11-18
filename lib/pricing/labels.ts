// 통계 결과 → 화면 문구. docs/wireframe.md §2.2 상태 배지 규칙.
// "역대 최저가" 대신 항상 "수집 기간 최저가"라고 쓴다.

import { formatAgo } from "@/lib/format";
import type { AttemptOutcome, PriceSource, PriceStats, WindowStat } from "./types";

export type Tone = "ok" | "warn" | "error" | "muted" | "sample" | "outline";

export interface BadgeLabel {
  text: string;
  tone: Tone;
}

export function healthBadge(stats: PriceStats, now: Date): BadgeLabel {
  switch (stats.health) {
    case "ok":
      return { text: "정상", tone: "ok" };
    case "stale":
      return {
        text: stats.lastSuccessAt ? `${formatAgo(stats.lastSuccessAt, now)} 데이터` : "오래된 데이터",
        tone: "warn",
      };
    case "failing":
      return { text: `수집 실패 (${stats.consecutiveFailures}회 연속)`, tone: "error" };
    case "no_data":
      return { text: "수집 기록 없음", tone: "muted" };
  }
}

export function sourceBadge(source: PriceSource): BadgeLabel {
  switch (source) {
    case "sample":
      return { text: "샘플", tone: "sample" };
    case "manual":
      return { text: "수동 입력", tone: "outline" };
    case "api":
      return { text: "API 수집", tone: "outline" };
    case "crawl":
      return { text: "자동 수집", tone: "outline" };
  }
}

/** 기간 최저가 칸이 데이터 부족일 때의 설명 */
export function insufficientText(w: Extract<WindowStat, { kind: "insufficient" }>, stats: PriceStats): string {
  switch (w.reason) {
    case "no_data":
      return stats.recordCount > 0 ? "계산할 수 있는 기록 없음 (품절 제외)" : "수집 기록 없음";
    case "too_short":
      return `${stats.collectedDays}일 수집 (${w.days}일 필요)`;
    case "low_coverage":
      return `최근 ${w.days}일 중 ${w.collectedDays}일만 수집`;
  }
}

export function outcomeLabel(outcome: AttemptOutcome): string {
  const labels: Record<AttemptOutcome, string> = {
    success: "성공",
    http_error: "HTTP 오류",
    blocked: "차단됨",
    not_found: "상품 없음",
    parse_error: "파싱 실패",
    timeout: "시간 초과",
    policy_disabled: "수집 꺼짐",
    unknown: "알 수 없음",
  };
  return labels[outcome];
}
