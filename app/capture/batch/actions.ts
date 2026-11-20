"use server";

import { redirect } from "next/navigation";
import { isAdmin, requireAdmin } from "@/lib/auth/admin";
import { validatePriceForm, type PriceRowInput } from "@/lib/forms/prices";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createReadClient } from "@/lib/supabase/server";

export interface BatchMatch {
  externalId: string;
  listingId: number;
  productId: number;
  /** 예: "피뎁트 모터사이클 Lightweight Windbreaker · Black" */
  label: string;
  variantCount: number;
  /** 옵션 중 가장 낮은 직전 판매가 */
  previousPrice: number | null;
}

export type BatchResolve = { status: "login" } | { status: "ok"; matches: BatchMatch[] } | { status: "error"; message: string };

interface ListingInfo {
  listingId: number;
  productId: number;
  externalId: string;
  label: string;
  isSample: boolean;
  variants: { id: number; option: string; latest: number | null }[];
}

/** 무신사 상품 번호 또는 판매처 id 로 등록된 판매처와 옵션·직전 가격을 읽는다 */
async function loadListings(filter: { externalIds: string[] } | { listingIds: number[] }): Promise<ListingInfo[]> {
  const db = createReadClient();
  let q = db
    .from("listings")
    .select(
      `id, external_id, product_id, platforms!inner ( code ),
       products!inner ( name, is_sample, brands ( name ) ),
       listing_variants ( id, option_label_raw, product_variants ( color ) )`,
    )
    .eq("platforms.code", "musinsa");
  q = "externalIds" in filter ? q.in("external_id", filter.externalIds) : q.in("id", filter.listingIds);
  const { data, error } = await q;
  if (error) throw new Error(`판매처 조회 실패: ${error.message}`);

  const variantIds = data.flatMap((l) => l.listing_variants.map((v) => v.id));
  const latest = new Map<number, number | null>();
  if (variantIds.length) {
    const { data: lp, error: e2 } = await db
      .from("v_latest_price")
      .select("listing_variant_id, sale_price")
      .in("listing_variant_id", variantIds);
    if (e2) throw new Error(`최신 가격 조회 실패: ${e2.message}`);
    for (const r of lp) if (r.listing_variant_id !== null) latest.set(r.listing_variant_id, r.sale_price);
  }

  return data.map((l) => {
    const color = l.listing_variants.find((v) => v.product_variants?.color)?.product_variants?.color;
    const name = `${l.products.brands?.name ?? ""} ${l.products.name}`.trim();
    return {
      listingId: l.id,
      productId: l.product_id,
      externalId: l.external_id,
      label: color ? `${name} · ${color}` : name,
      isSample: l.products.is_sample,
      variants: [...l.listing_variants]
        .sort((a, b) => a.id - b.id)
        .map((v) => ({ id: v.id, option: v.option_label_raw, latest: latest.get(v.id) ?? null })),
    };
  });
}

/** 가져온 상품 번호 중 등록된 판매처 찾기 (조회만) */
export async function resolveBatchAction(externalIds: string[]): Promise<BatchResolve> {
  if (!(await isAdmin())) return { status: "login" };
  const ids = externalIds.filter((x) => /^\d{1,12}$/.test(x)).slice(0, 200);
  if (ids.length === 0) return { status: "ok", matches: [] };
  try {
    const listings = await loadListings({ externalIds: ids });
    return {
      status: "ok",
      matches: listings
        .filter((l) => !l.isSample)
        .map((l) => {
          const prices = l.variants.map((v) => v.latest).filter((p): p is number => p !== null);
          return {
            externalId: l.externalId,
            listingId: l.listingId,
            productId: l.productId,
            label: l.label,
            variantCount: l.variants.length,
            previousPrice: prices.length ? Math.min(...prices) : null,
          };
        }),
    };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "조회하지 못했습니다." };
  }
}

export interface BatchSaveState {
  errors: string[];
  bigChanges: string[];
  values: Record<string, string>;
}

/**
 * 체크한 판매처마다 같은 가격을 모든 옵션에 기록한다 (한 트랜잭션).
 * 옵션 목록과 직전 가격은 화면 값이 아니라 DB 에서 다시 읽는다.
 */
export async function recordBatchAction(_prev: BatchSaveState, fd: FormData): Promise<BatchSaveState> {
  await requireAdmin("/capture/batch");

  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") values[k] = v;

  const count = Math.min(Number(values.row_count) || 0, 200);
  const chosen = Array.from({ length: count }, (_, i) => i)
    .filter((i) => values[`row_${i}_on`] === "on")
    .map((i) => ({
      listingId: Number(values[`row_${i}_listing`]),
      sale: values[`row_${i}_sale`] ?? "",
      list: values[`row_${i}_list`] ?? "",
      stock: values[`row_${i}_stock`] ?? "unknown",
    }))
    .filter((r) => Number.isSafeInteger(r.listingId) && r.listingId > 0);
  if (chosen.length === 0) return { errors: ["기록할 판매처를 1개 이상 체크해 주세요."], bigChanges: [], values };

  let listings: ListingInfo[];
  try {
    listings = await loadListings({ listingIds: chosen.map((c) => c.listingId) });
  } catch (e) {
    return { errors: [e instanceof Error ? e.message : "판매처를 확인하지 못했습니다."], bigChanges: [], values };
  }
  const byId = new Map(listings.map((l) => [l.listingId, l]));

  const rows: PriceRowInput[] = [];
  const listingOfVariant = new Map<number, number>();
  for (const c of chosen) {
    const l = byId.get(c.listingId);
    if (!l) return { errors: ["등록되지 않은 판매처가 있습니다. 새로고침 후 다시 시도해 주세요."], bigChanges: [], values };
    if (l.isSample) return { errors: [`샘플 상품에는 기록할 수 없습니다: ${l.label}`], bigChanges: [], values };
    for (const v of l.variants) {
      listingOfVariant.set(v.id, l.listingId);
      rows.push({
        listingVariantId: v.id,
        label: `${l.label} · ${v.option}`,
        listPrice: c.list,
        salePrice: c.sale,
        stock: c.stock,
        previousSale: v.latest,
      });
    }
  }

  const result = validatePriceForm({
    collectedAtLocal: values.collectedAt ?? "",
    rows,
    confirmBigChange: values.confirmBigChange === "on",
    now: new Date(),
  });
  if (!result.ok) return { errors: result.errors, bigChanges: result.bigChanges, values };

  const grouped = new Map<number, typeof result.items>();
  for (const it of result.items) {
    const lid = listingOfVariant.get(it.listing_variant_id)!;
    grouped.set(lid, [...(grouped.get(lid) ?? []), it]);
  }

  const { data, error } = await createAdminClient().rpc("record_manual_prices_batch", {
    p_collected_at: result.collectedAt.toISOString(),
    p_listings: [...grouped].map(([listing_id, items]) => ({ listing_id, items })) as unknown as Json,
  });
  if (error) {
    const message = /duplicate key/.test(error.message)
      ? "같은 시각의 기록이 이미 있는 판매처가 있습니다. 확인 시각을 바꿔 주세요."
      : `저장하지 못했습니다: ${error.message}`;
    return { errors: [message], bigChanges: [], values };
  }
  redirect(`/capture/batch?saved=${data}`);
}
