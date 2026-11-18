import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/Badge";
import { CheckList } from "@/components/CheckList";
import { ProductTable } from "@/components/ProductTable";
import { SampleBanner } from "@/components/SampleBanner";
import { formatAgo } from "@/lib/format";
import { healthBadge } from "@/lib/pricing/labels";
import { NEAR_LOW_PCT, isNearLow } from "@/lib/pricing/summary";
import { isAdmin } from "@/lib/auth/admin";
import { buildCheckList } from "@/lib/pricing/checklist";
import { listCheckTargets, listProducts } from "@/lib/repositories/product-list";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">대시보드</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="text-xs text-zinc-600 dark:text-zinc-400">{note}</div>}
    </div>
  );
}

async function Dashboard() {
  await connection();
  const now = new Date();
  const [items, admin] = await Promise.all([listProducts(undefined, now), isAdmin()]);
  // 할 일 목록은 관리자에게만 보인다
  const checkList = admin ? buildCheckList(await listCheckTargets(), now) : null;

  const nearLow = items
    .filter((p) => isNearLow(p.summary))
    .sort((a, b) => a.summary.nearestLowPct! - b.summary.nearestLowPct!);
  const attention = items.filter((p) => p.summary.health === "failing" || p.summary.health === "stale");
  const failing = items.filter((p) => p.summary.health === "failing").length;
  const lastAttempt = items
    .map((p) => p.summary.lastAttemptAt)
    .reduce<Date | null>((m, d) => (d && (!m || d > m) ? d : m), null);

  if (items.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">추적 중인 상품이 없습니다.</p>;
  }

  return (
    <>
      {items.some((p) => p.isSample) && <SampleBanner />}

      {checkList && <CheckList data={checkList} now={now} />}

      <section aria-label="요약" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="추적 상품" value={`${items.length}`} />
        <Tile label="최저가 근접" value={`${nearLow.length}`} note={`수집 기간 최저가 +${NEAR_LOW_PCT}% 이내`} />
        <Tile label="수집 실패" value={`${failing}`} />
        <Tile label="마지막 수집 시도" value={lastAttempt ? formatAgo(lastAttempt, now) : "—"} />
      </section>

      <section aria-label="최저가 근접 상품" className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">수집 기간 최저가 근접 상품</h2>
        {nearLow.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            현재가가 수집 기간 최저가의 +{NEAR_LOW_PCT}% 이내인 상품이 없습니다.
          </p>
        ) : (
          <ProductTable items={nearLow} now={now} />
        )}
      </section>

      <section aria-label="주의 필요" className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">주의 필요</h2>
        {attention.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">수집 실패나 오래된 데이터가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge label={healthBadge(p.summary, now)} />
                <Link href={`/products/${p.id}`} className="underline-offset-2 hover:underline">
                  {p.brandName} {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/products" className="text-sm underline underline-offset-2">
        전체 상품 보기 →
      </Link>
    </>
  );
}
