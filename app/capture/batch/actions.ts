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

const MAX_NEW = 100;

/**
 * 저장 1회로 처리한다 (한 트랜잭션, capture_batch_save):
 * - 등록된 판매처(row_*): 같은 가격을 모든 옵션에 기록. 옵션·직전 가격은 DB 에서 다시 읽는다.
 * - 미등록 상품(new_*): 상품 1개 + 판매처 1개 + 옵션 "전체 옵션" 으로 등록하고 가격 기록.
 */
export async function recordBatchAction(_prev: BatchSaveState, fd: FormData): Promise<BatchSaveState> {
  await requireAdmin("/capture/batch");

  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") values[k] = v;
  const fail = (errors: string[], bigChanges: string[] = []): BatchSaveState => ({ errors, bigChanges, values });

  const rowCount = Math.min(Number(values.row_count) || 0, 200);
  const chosen = Array.from({ length: rowCount }, (_, i) => i)
    .filter((i) => values[`row_${i}_on`] === "on")
    .map((i) => ({
      listingId: Number(values[`row_${i}_listing`]),
      sale: values[`row_${i}_sale`] ?? "",
      list: values[`row_${i}_list`] ?? "",
      stock: values[`row_${i}_stock`] ?? "unknown",
    }))
    .filter((r) => Number.isSafeInteger(r.listingId) && r.listingId > 0);

  const fallbackBrand = (values.fallbackBrand ?? "").trim();
  const newCount = Math.min(Number(values.new_count) || 0, 200);
  const newRows = Array.from({ length: newCount }, (_, i) => i)
    .filter((i) => values[`new_${i}_on`] === "on")
    .map((i) => ({
      externalId: values[`new_${i}_id`] ?? "",
      brand: (values[`new_${i}_brand`] ?? "").trim() || fallbackBrand,
      name: (values[`new_${i}_name`] ?? "").trim(),
      sale: values[`new_${i}_sale`] ?? "",
      list: values[`new_${i}_list`] ?? "",
      stock: values[`new_${i}_stock`] ?? "unknown",
    }));

  if (chosen.length === 0 && newRows.length === 0) return fail(["저장할 항목을 1개 이상 체크해 주세요."]);
  if (newRows.length > MAX_NEW) return fail([`새 상품은 한 번에 ${MAX_NEW}개까지 등록할 수 있습니다. 체크를 줄여 주세요.`]);

  const errors: string[] = [];
  for (const r of newRows) {
    const who = r.name || r.externalId;
    if (!/^\d{1,12}$/.test(r.externalId)) errors.push(`${who}: 상품 번호가 올바르지 않습니다.`);
    if (!r.brand || r.brand.length > 50) errors.push(`${who}: 브랜드를 1~50자로 입력해 주세요.`);
    if (!r.name || r.name.length > 200) errors.push(`${r.externalId}: 상품명을 1~200자로 입력해 주세요.`);
  }
  if (new Set(newRows.map((r) => r.externalId)).size !== newRows.length) errors.push("같은 상품이 두 번 들어 있습니다.");
  if (errors.length) return fail(errors);

  // 이미 등록된 상품이 새 상품으로 들어오지 않게
  if (newRows.length) {
    const { data: dup, error } = await createReadClient()
      .from("listings")
      .select("external_id, platforms!inner ( code )")
      .eq("platforms.code", "musinsa")
      .in("external_id", newRows.map((r) => r.externalId));
    if (error) return fail([`등록 여부를 확인하지 못했습니다: ${error.message}`]);
    if (dup.length) return fail([`이미 등록된 상품이 있습니다 (${dup.map((d) => d.external_id).join(", ")}). 새로고침 후 다시 시도해 주세요.`]);
  }

  let listings: ListingInfo[] = [];
  if (chosen.length) {
    try {
      listings = await loadListings({ listingIds: chosen.map((c) => c.listingId) });
    } catch (e) {
      return fail([e instanceof Error ? e.message : "판매처를 확인하지 못했습니다."]);
    }
  }
  const byId = new Map(listings.map((l) => [l.listingId, l]));

  // 가격 검증은 기존 규칙(validatePriceForm)을 그대로 쓴다. 새 상품은 음수 임시 id 로 구분
  const rows: PriceRowInput[] = [];
  const listingOfVariant = new Map<number, number>();
  for (const c of chosen) {
    const l = byId.get(c.listingId);
    if (!l) return fail(["등록되지 않은 판매처가 있습니다. 새로고침 후 다시 시도해 주세요."]);
    if (l.isSample) return fail([`샘플 상품에는 기록할 수 없습니다: ${l.label}`]);
    for (const v of l.variants) {
      listingOfVariant.set(v.id, l.listingId);
      rows.push({ listingVariantId: v.id, label: `${l.label} · ${v.option}`, listPrice: c.list, salePrice: c.sale, stock: c.stock, previousSale: v.latest });
    }
  }
  newRows.forEach((r, i) => {
    rows.push({ listingVariantId: -(i + 1), label: `${r.brand} ${r.name}`, listPrice: r.list, salePrice: r.sale, stock: r.stock, previousSale: null });
  });
  // 새 상품은 판매가가 비어 있으면 등록할 수 없다 (validatePriceForm 은 빈 판매가를 건너뛰므로 따로 확인)
  const noPrice = newRows.filter((r) => r.sale.trim() === "");
  if (noPrice.length) return fail(noPrice.map((r) => `${r.brand} ${r.name}: 판매가를 입력하거나 체크를 해제해 주세요.`));

  const result = validatePriceForm({
    collectedAtLocal: values.collectedAt ?? "",
    rows,
    confirmBigChange: values.confirmBigChange === "on",
    now: new Date(),
  });
  if (!result.ok) return fail(result.errors, result.bigChanges);

  const grouped = new Map<number, typeof result.items>();
  const newItems: Json[] = [];
  for (const it of result.items) {
    if (it.listing_variant_id < 0) {
      const r = newRows[-it.listing_variant_id - 1];
      newItems.push({
        brand: r.brand,
        name: r.name,
        external_id: r.externalId,
        url: `https://www.musinsa.com/products/${r.externalId}`,
        list_price: it.list_price,
        sale_price: it.sale_price,
        stock_status: it.stock_status,
      });
    } else {
      const lid = listingOfVariant.get(it.listing_variant_id)!;
      grouped.set(lid, [...(grouped.get(lid) ?? []), it]);
    }
  }

  const { data, error } = await createAdminClient().rpc("capture_batch_save", {
    p_collected_at: result.collectedAt.toISOString(),
    p_listings: [...grouped].map(([listing_id, items]) => ({ listing_id, items })) as unknown as Json,
    p_new_items: newItems as Json,
  });
  if (error) {
    const message = /duplicate key/.test(error.message)
      ? "이미 등록된 상품이 있거나, 같은 시각의 기록이 이미 있습니다. 새로고침하거나 확인 시각을 바꿔 주세요."
      : `저장하지 못했습니다: ${error.message}`;
    return fail([message]);
  }
  const { recorded, registered } = data as { recorded: number; registered: number };
  redirect(`/capture/batch?saved=${recorded}&registered=${registered}`);
}
