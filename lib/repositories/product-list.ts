import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { sanitizeQuery } from "@/lib/search";
import { summarizeProduct, type ProductSummary } from "@/lib/pricing/summary";
import type { AlertVariant } from "@/lib/pricing/alerts";
import type { CheckTarget } from "@/lib/pricing/checklist";
import type { TrendPoint } from "@/lib/pricing/trend";
import type { StockStatus } from "@/lib/pricing/types";

export interface ProductListItem {
  id: number;
  name: string;
  modelNo: string | null;
  category: string | null;
  createdAt: Date;
  brandName: string;
  isSample: boolean;
  platformNames: string[];
  summary: ProductSummary;
  /** 알림 판정용 옵션별 값 (lib/pricing/alerts) */
  alertVariants: AlertVariant[];
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what} 조회 실패: ${error.message}`);
}

/**
 * 상품 목록과 요약. q 가 있으면 상품명·모델번호·브랜드명 부분 일치로 거른다.
 * MVP 규모(상품 수십 개)를 전제로 한 번에 읽는다.
 */
export async function listProducts(q: string | undefined, now: Date): Promise<ProductListItem[]> {
  const db = createReadClient();
  const term = q ? sanitizeQuery(q) : "";

  let query = db
    .from("products")
    .select(
      `id, name, model_no, category, is_sample, brand_id, created_at,
       brands ( name ),
       listings ( id, platforms ( name ), listing_variants ( id, option_label_raw ) )`,
    )
    .order("id", { ascending: true });

  if (term) {
    const { data: brands, error } = await db.from("brands").select("id").ilike("name", `%${term}%`);
    if (error) fail("브랜드", error);
    const filters = [`name.ilike.%${term}%`, `model_no.ilike.%${term}%`];
    if (brands.length > 0) filters.push(`brand_id.in.(${brands.map((b) => b.id).join(",")})`);
    query = query.or(filters.join(","));
  }

  const { data: products, error } = await query;
  if (error) fail("상품 목록", error);
  if (products.length === 0) return [];

  const listingIds = products.flatMap((p) => p.listings.map((l) => l.id));
  const variantIds = products.flatMap((p) => p.listings.flatMap((l) => l.listing_variants.map((v) => v.id)));

  const [latestRes, summaryRes, healthRes] = await Promise.all([
    variantIds.length
      ? db.from("v_latest_price").select("listing_variant_id, sale_price, stock_status").in("listing_variant_id", variantIds)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? db
          .from("v_variant_price_summary")
          .select("listing_variant_id, record_count, low_price, low_at, low_first_at, first_collected_at, has_sample")
          .in("listing_variant_id", variantIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? db
          .from("v_listing_health")
          .select("listing_id, last_attempt_at, last_success_at, failures_since_success")
          .in("listing_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (latestRes.error) fail("최신 가격", latestRes.error);
  if (summaryRes.error) fail("가격 요약", summaryRes.error);
  if (healthRes.error) fail("수집 상태", healthRes.error);

  const latest = new Map(latestRes.data.map((r) => [r.listing_variant_id, r]));
  const sums = new Map(summaryRes.data.map((r) => [r.listing_variant_id, r]));
  const health = new Map(healthRes.data.map((r) => [r.listing_id, r]));
  const toDate = (s: string | null | undefined) => (s ? new Date(s) : null);

  return products.map((p) => {
    const variants = p.listings.flatMap((l) =>
      l.listing_variants.map((v) => {
        const lp = latest.get(v.id);
        const sm = sums.get(v.id);
        return {
          label: `${l.platforms?.name ?? ""} · ${v.option_label_raw}`,
          latestPrice: lp?.sale_price ?? null,
          latestStock: (lp?.stock_status ?? null) as StockStatus | null,
          lowPrice: sm?.low_price ?? null,
          lowAt: toDate(sm?.low_at),
          recordCount: sm?.record_count ?? 0,
          hasSample: sm?.has_sample ?? false,
        };
      }),
    );
    const listings = p.listings.map((l) => {
      const h = health.get(l.id);
      return {
        failuresSinceSuccess: h?.failures_since_success ?? 0,
        lastSuccessAt: toDate(h?.last_success_at),
        lastAttemptAt: toDate(h?.last_attempt_at),
        hasRecords: l.listing_variants.some((v) => (sums.get(v.id)?.record_count ?? 0) > 0),
      };
    });

    const alertVariants: AlertVariant[] = p.listings.flatMap((l) =>
      l.listing_variants.map((v) => {
        const lp = latest.get(v.id);
        const sm = sums.get(v.id);
        return {
          label: `${l.platforms?.name ?? ""} · ${v.option_label_raw}`,
          latestPrice: lp?.sale_price ?? null,
          latestStock: lp?.stock_status ?? null,
          lowPrice: sm?.low_price ?? null,
          lowFirstAt: toDate(sm?.low_first_at),
          firstCollectedAt: toDate(sm?.first_collected_at),
        };
      }),
    );

    return {
      id: p.id,
      name: p.name,
      modelNo: p.model_no,
      category: p.category,
      createdAt: new Date(p.created_at),
      brandName: p.brands?.name ?? "",
      isSample: p.is_sample,
      platformNames: [...new Set(p.listings.map((l) => l.platforms?.name ?? ""))].filter(Boolean),
      summary: summarizeProduct(variants, listings, now),
      alertVariants,
    };
  });
}

/** "오늘 확인할 상품" 대상: 실제(샘플 아님) 상품의 판매처별 마지막 성공 시각 */
export async function listCheckTargets(): Promise<CheckTarget[]> {
  const db = createReadClient();
  const { data: products, error } = await db
    .from("products")
    .select(
      `id, name, model_no, brands ( name ),
       listings ( id, url, status, platforms ( name ), listing_variants ( id, product_variants ( color ) ) )`,
    )
    .eq("is_sample", false)
    .order("id", { ascending: true });
  if (error) fail("확인 대상", error);

  const listings = products.flatMap((p) =>
    p.listings.filter((l) => l.status === "active").map((l) => ({ p, l })),
  );
  if (listings.length === 0) return [];

  const { data: health, error: e2 } = await db
    .from("v_listing_health")
    .select("listing_id, last_success_at")
    .in("listing_id", listings.map(({ l }) => l.id));
  if (e2) fail("수집 상태", e2);
  const last = new Map(health.map((h) => [h.listing_id, h.last_success_at]));

  return listings.map(({ p, l }) => {
    const at = last.get(l.id);
    return {
      listingId: l.id,
      productId: p.id,
      brandName: p.brands?.name ?? "",
      productName: p.name,
      modelNo: p.model_no,
      platformName: l.platforms?.name ?? "",
      color: l.listing_variants.find((v) => v.product_variants?.color)?.product_variants?.color ?? "",
      url: l.url,
      variantCount: l.listing_variants.length,
      lastSuccessAt: at ? new Date(at) : null,
    };
  });
}

const TREND_PAGE_SIZE = 1000;

/** 판매처들의 `since` 이후 유효(무효 제외) 가격 기록. 대시보드 미니 그래프·7일 변동률용 */
export async function listTrendPoints(listingIds: readonly number[], since: Date): Promise<TrendPoint[]> {
  if (listingIds.length === 0) return [];
  const db = createReadClient();
  const { data: lvs, error } = await db.from("listing_variants").select("id, listing_id").in("listing_id", [...listingIds]);
  if (error) fail("판매처 옵션", error);
  if (lvs.length === 0) return [];
  const listingOf = new Map(lvs.map((v) => [v.id, v.listing_id]));

  const out: TrendPoint[] = [];
  for (let from = 0; ; from += TREND_PAGE_SIZE) {
    const { data, error: e2 } = await db
      .from("price_snapshots")
      .select("id, listing_variant_id, collected_at, sale_price, stock_status")
      .in("listing_variant_id", [...listingOf.keys()])
      .eq("is_void", false)
      .gte("collected_at", since.toISOString())
      .order("id", { ascending: true })
      .range(from, from + TREND_PAGE_SIZE - 1);
    if (e2) fail("가격 추이", e2);
    for (const r of data) {
      out.push({
        listingId: listingOf.get(r.listing_variant_id) as number,
        collectedAt: new Date(r.collected_at),
        salePrice: r.sale_price,
        soldOut: r.stock_status === "sold_out",
      });
    }
    if (data.length < TREND_PAGE_SIZE) break;
  }
  return out;
}
