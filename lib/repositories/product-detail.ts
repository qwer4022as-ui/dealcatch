import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import type { CompareRow } from "@/lib/pricing/compare";
import { summarizeProduct } from "@/lib/pricing/summary";
import type { AttemptOutcome, CollectionAttempt, PriceSnapshot, PriceSource, StockStatus } from "@/lib/pricing/types";

const PAGE_SIZE = 1000; // Supabase API 기본 최대 행 수
const ATTEMPT_LIMIT = 200;

export interface VariantOption {
  listingVariantId: number;
  listingId: number;
  platformName: string;
  optionLabel: string;
  color: string | null;
  size: string | null;
  latestPrice: number | null;
  latestStock: string | null;
}

export interface ProductDetail {
  id: number;
  name: string;
  modelNo: string | null;
  category: string | null;
  brandName: string;
  isSample: boolean;
  listings: { id: number; url: string; platformName: string; status: string }[];
  variants: VariantOption[];
}

export interface AttemptRow extends CollectionAttempt {
  id: number;
  errorDetail: string | null;
}

export interface VariantHistory {
  snapshots: (PriceSnapshot & { id: number; attemptId: number; voidReason: string | null })[];
  attempts: AttemptRow[];
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what} 조회 실패: ${error.message}`);
}

export async function getProductDetail(productId: number): Promise<ProductDetail | null> {
  const db = createReadClient();
  const { data, error } = await db
    .from("products")
    .select(
      `id, name, model_no, category, is_sample,
       brands ( name ),
       listings ( id, url, status, platforms ( name ),
         listing_variants ( id, option_label_raw, product_variants ( color, size ) ) )`,
    )
    .eq("id", productId)
    .maybeSingle();
  if (error) fail("상품", error);
  if (!data) return null;

  const listings = [...data.listings].sort((a, b) => a.id - b.id);
  const variantRows = listings.flatMap((l) =>
    [...l.listing_variants]
      .sort((a, b) => a.id - b.id)
      .map((lv) => ({ lv, listing: l })),
  );

  const ids = variantRows.map((r) => r.lv.id);
  const latest = new Map<number, { sale_price: number | null; stock_status: string | null }>();
  if (ids.length > 0) {
    const { data: rows, error: e2 } = await db
      .from("v_latest_price")
      .select("listing_variant_id, sale_price, stock_status")
      .in("listing_variant_id", ids);
    if (e2) fail("최신 가격", e2);
    for (const r of rows ?? []) if (r.listing_variant_id != null) latest.set(r.listing_variant_id, r);
  }

  return {
    id: data.id,
    name: data.name,
    modelNo: data.model_no,
    category: data.category,
    brandName: data.brands?.name ?? "",
    isSample: data.is_sample,
    listings: listings.map((l) => ({
      id: l.id,
      url: l.url,
      platformName: l.platforms?.name ?? "",
      status: l.status,
    })),
    variants: variantRows.map(({ lv, listing }) => ({
      listingVariantId: lv.id,
      listingId: listing.id,
      platformName: listing.platforms?.name ?? "",
      optionLabel: lv.option_label_raw,
      color: lv.product_variants?.color ?? null,
      size: lv.product_variants?.size ?? null,
      latestPrice: latest.get(lv.id)?.sale_price ?? null,
      latestStock: latest.get(lv.id)?.stock_status ?? null,
    })),
  };
}

/** 옵션 하나의 전체 가격 기록(무효 포함)과 리스팅의 최근 수집 시도 */
export async function getVariantHistory(listingVariantId: number, listingId: number): Promise<VariantHistory> {
  const db = createReadClient();

  const snapshots: VariantHistory["snapshots"] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("price_snapshots")
      .select("id, attempt_id, collected_at, sale_price, list_price, stock_status, source, is_void, void_reason")
      .eq("listing_variant_id", listingVariantId)
      .order("collected_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) fail("가격 기록", error);
    for (const r of data) {
      snapshots.push({
        id: r.id,
        attemptId: r.attempt_id,
        voidReason: r.void_reason,
        collectedAt: new Date(r.collected_at),
        salePrice: r.sale_price,
        listPrice: r.list_price,
        stockStatus: r.stock_status,
        source: r.source as PriceSource,
        isVoid: r.is_void,
      });
    }
    if (data.length < PAGE_SIZE) break;
  }

  const { data: attemptRows, error } = await db
    .from("collection_attempts")
    .select("id, attempted_at, outcome, error_detail")
    .eq("listing_id", listingId)
    .order("attempted_at", { ascending: false })
    .limit(ATTEMPT_LIMIT);
  if (error) fail("수집 시도", error);

  return {
    snapshots,
    attempts: attemptRows.map((a) => ({
      id: a.id,
      attemptedAt: new Date(a.attempted_at),
      outcome: a.outcome as AttemptOutcome,
      errorDetail: a.error_detail,
    })),
  };
}

/**
 * 판매처(색상 페이지)별 요약. 목록 화면과 같은 기준(summarizeProduct)을 판매처 단위로 적용한다.
 * 판매처가 2개 이상일 때 상세 화면의 비교표에 쓴다.
 */
export async function getListingComparison(product: ProductDetail, now: Date): Promise<CompareRow[]> {
  if (product.listings.length < 2) return [];
  const db = createReadClient();
  const variantIds = product.variants.map((v) => v.listingVariantId);
  const [sumRes, healthRes] = await Promise.all([
    db
      .from("v_variant_price_summary")
      .select("listing_variant_id, record_count, low_price, low_at, has_sample")
      .in("listing_variant_id", variantIds),
    db
      .from("v_listing_health")
      .select("listing_id, last_attempt_at, last_success_at, failures_since_success")
      .in("listing_id", product.listings.map((l) => l.id)),
  ]);
  if (sumRes.error) fail("가격 요약", sumRes.error);
  if (healthRes.error) fail("수집 상태", healthRes.error);
  const sums = new Map(sumRes.data.map((r) => [r.listing_variant_id, r]));
  const health = new Map(healthRes.data.map((r) => [r.listing_id, r]));
  const toDate = (s: string | null | undefined) => (s ? new Date(s) : null);

  return product.listings.map((l) => {
    const vs = product.variants.filter((v) => v.listingId === l.id);
    const h = health.get(l.id);
    const color = vs.find((v) => v.color)?.color;
    return {
      listingId: l.id,
      label: color ? `${l.platformName} · ${color}` : `${l.platformName} #${l.id}`,
      url: l.url,
      summary: summarizeProduct(
        vs.map((v) => {
          const sm = sums.get(v.listingVariantId);
          return {
            label: v.optionLabel,
            latestPrice: v.latestPrice,
            latestStock: (v.latestStock ?? null) as StockStatus | null,
            lowPrice: sm?.low_price ?? null,
            lowAt: toDate(sm?.low_at),
            recordCount: sm?.record_count ?? 0,
            hasSample: sm?.has_sample ?? false,
          };
        }),
        [
          {
            failuresSinceSuccess: h?.failures_since_success ?? 0,
            lastSuccessAt: toDate(h?.last_success_at),
            lastAttemptAt: toDate(h?.last_attempt_at),
            hasRecords: vs.some((v) => (sums.get(v.listingVariantId)?.record_count ?? 0) > 0),
          },
        ],
        now,
      ),
    };
  });
}
