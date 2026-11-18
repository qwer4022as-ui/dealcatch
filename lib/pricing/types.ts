// 가격 통계 계산에 쓰는 타입. DB 행(snake_case)을 저장소 계층에서 이 형태로 변환해 넘긴다.
// docs/PRD.md §4 F4, docs/database.md §3.7–3.9

export type PriceSource = "sample" | "manual" | "api" | "crawl";
export type StockStatus = "in_stock" | "low" | "sold_out" | "unknown";
export type AttemptOutcome =
  | "success"
  | "http_error"
  | "blocked"
  | "not_found"
  | "parse_error"
  | "timeout"
  | "policy_disabled"
  | "unknown";

/** price_snapshots 한 행 (플랫폼 옵션 하나의 가격 기록) */
export interface PriceSnapshot {
  collectedAt: Date;
  /** 비교 기준 가격 (원, 정수) */
  salePrice: number;
  listPrice: number | null;
  stockStatus: StockStatus;
  source: PriceSource;
  isVoid: boolean;
}

/** collection_attempts 한 행 (리스팅 단위 수집 시도) */
export interface CollectionAttempt {
  attemptedAt: Date;
  outcome: AttemptOutcome;
}

export interface PricingConfig {
  /** 기간 최저가를 표시하려면 기간 내 수집 성공일 비율이 이 값 이상이어야 한다 */
  coverageThreshold: number;
  /** 마지막 성공 수집이 이 시간보다 오래되면 "오래됨" */
  staleAfterHours: number;
  /** 품절 상태의 가격을 최저가 계산에서 제외할지 */
  excludeSoldOut: boolean;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  coverageThreshold: 0.7,
  staleAfterHours: 24,
  excludeSoldOut: true,
};

export interface CurrentPrice {
  salePrice: number;
  listPrice: number | null;
  collectedAt: Date;
  source: PriceSource;
  stockStatus: StockStatus;
  /** 정가 대비 할인율(%) — 정가가 없으면 null */
  discountRatePct: number | null;
}

export interface LowPoint {
  price: number;
  /** 최저가가 기록된 가장 최근 시각 */
  at: Date;
  /** (현재가 − 최저가) / 최저가 × 100. 현재가가 없으면 null */
  currentVsLowPct: number | null;
}

export type InsufficientReason =
  /** 계산에 쓸 수 있는 기록이 없음 (기록이 없거나 전부 품절·무효) */
  | "no_data"
  /** 첫 수집이 기간 시작보다 늦음 */
  | "too_short"
  /** 기간 내 수집 성공일 비율이 기준 미달 */
  | "low_coverage";

export type WindowStat =
  | { kind: "ok"; days: number; low: LowPoint; coverage: number }
  | {
      kind: "insufficient";
      days: number;
      reason: InsufficientReason;
      /** 기간 내 수집 성공일 수 (KST 기준) */
      collectedDays: number;
      coverage: number;
    };

export type Health =
  /** 수집 기록이 없음 */
  | "no_data"
  /** 마지막 수집 시도가 실패 */
  | "failing"
  /** 마지막 성공 수집이 기준 시간보다 오래됨 */
  | "stale"
  | "ok";

export interface PriceStats {
  current: CurrentPrice | null;
  /** 수집 기간 전체 최저가 ("역대 최저가"가 아님) */
  periodLow: LowPoint | null;
  window30: WindowStat;
  window90: WindowStat;
  /** 유효 기록 수 (무효 제외) */
  recordCount: number;
  firstCollectedAt: Date | null;
  lastCollectedAt: Date | null;
  /** 수집 성공일 수 (KST 기준, 전체 기간) */
  collectedDays: number;
  health: Health;
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
  /** 유효 기록 중 샘플 데이터가 있는지 */
  hasSample: boolean;
}
