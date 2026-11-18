import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { toKstLocal } from "@/lib/forms/prices";
import { getProductDetail } from "@/lib/repositories/product-detail";
import { PriceForm } from "./PriceForm";

export default function NewPricePage(props: PageProps<"/products/[id]/prices/new">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <NewPriceBody {...props} />
      </Suspense>
    </main>
  );
}

async function NewPriceBody({ params, searchParams }: PageProps<"/products/[id]/prices/new">) {
  await connection();
  const { id } = await params;
  const { listing, registered } = await searchParams;
  await requireAdmin(`/products/${id}/prices/new`);

  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();
  const product = await getProductDetail(productId);
  if (!product) notFound();

  const header = (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold">수동 가격 입력</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href={`/products/${product.id}`} className="underline underline-offset-2">
          {product.brandName} {product.name}
        </Link>
      </p>
    </header>
  );

  if (product.isSample) {
    return (
      <>
        {header}
        <p className="text-sm">샘플 상품에는 가격을 입력할 수 없습니다. 샘플 데이터와 실제 데이터를 섞지 않기 위해서입니다.</p>
      </>
    );
  }

  const requested = Number(Array.isArray(listing) ? listing[0] : listing);
  const current = product.listings.find((l) => l.id === requested) ?? product.listings[0];
  if (!current) notFound();
  const variants = product.variants.filter((v) => v.listingId === current.id);
  const listingColor = (listingId: number) =>
    product.variants.find((v) => v.listingId === listingId && v.color)?.color ?? `#${listingId}`;

  return (
    <>
      {header}
      {registered && (
        <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          ● 상품을 등록했습니다{Number(registered) > 1 ? ` (판매처 ${registered}개)` : ""}. 지금 확인한 가격을 입력하세요.
          {product.listings.length > 1 && " 색상(판매처)마다 따로 저장합니다. 아래에서 색상을 바꿔 가며 입력하세요."}
        </div>
      )}
      {product.listings.length > 1 && (
        <nav aria-label="판매처 선택" className="flex flex-wrap gap-2 text-sm">
          {product.listings.map((l) => (
            <Link
              key={l.id}
              href={`/products/${product.id}/prices/new?listing=${l.id}`}
              aria-current={l.id === current.id ? "true" : undefined}
              className={`rounded-md px-3 py-1 ring-1 ring-inset ${l.id === current.id ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900" : "ring-zinc-300 dark:ring-zinc-700"}`}
            >
              {l.platformName} · {listingColor(l.id)}
            </Link>
          ))}
        </nav>
      )}
      <p className="text-sm">
        판매처: {current.platformName} · {listingColor(current.id)} ·{" "}
        <a href={current.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          상품 페이지 열기 ↗
        </a>
      </p>
      <PriceForm
        productId={product.id}
        listingId={current.id}
        variants={variants.map((v) => ({
          listingVariantId: v.listingVariantId,
          optionLabel: v.optionLabel,
          latestPrice: v.latestPrice,
        }))}
        defaultCollectedAt={toKstLocal(new Date())}
        listingUrl={current.url}
      />
    </>
  );
}
