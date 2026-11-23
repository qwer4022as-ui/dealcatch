import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import heroMascot from "@/public/hero-mascot.png";
import { Badge } from "@/components/Badge";
import { AlertList } from "@/components/AlertList";
import { CheckList } from "@/components/CheckList";
import { ProductTable } from "@/components/ProductTable";
import { SampleBanner } from "@/components/SampleBanner";
import { formatAgo } from "@/lib/format";
import { healthBadge } from "@/lib/pricing/labels";
import { NEAR_LOW_PCT, isNearLow } from "@/lib/pricing/summary";
import { isAdmin } from "@/lib/auth/admin";
import { evaluateAlerts } from "@/lib/pricing/alerts";
import { buildCheckList } from "@/lib/pricing/checklist";
import { getTargets } from "@/lib/repositories/alerts";
import { listCheckTargets, listProducts } from "@/lib/repositories/product-list";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <section className="relative grid items-center gap-6 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            의류 <span className="text-accent">가격 추적</span> 대시보드
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
            등록한 옷의 가격 변화를 한눈에 확인하고,
            <br />
            수집 기간 최저가를 놓치지 마세요.
          </p>
        </div>
        <Image
          src={heroMascot}
          alt="옷걸이 비니를 쓰고 노트북으로 옷 가격을 확인하는 캐릭터"
          priority
          className="h-auto w-full max-w-[680px] justify-self-end [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        />
      </section>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-zinc-50">{value}</div>
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
  const alerts = admin
    ? evaluateAlerts(
        await getTargets().then((targets) =>
          items.map((p) => ({
            productId: p.id,
            name: `${p.brandName} ${p.name}`,
            isSample: p.isSample,
            targetPrice: targets.get(p.id) ?? null,
            variants: p.alertVariants,
          })),
        ),
        now,
      )
    : null;

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

      {alerts && <AlertList targetHits={alerts.targetHits} newLows={alerts.newLows} now={now} />}

      {checkList && <CheckList data={checkList} now={now} />}

      <section aria-label="요약" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="추적 상품" value={`${items.length}`} />
        <Tile label="최저가 근접" value={`${nearLow.length}`} note={`수집 기간 최저가 +${NEAR_LOW_PCT}% 이내`} />
        <Tile label="수집 실패" value={`${failing}`} />
        <Tile label="마지막 수집 시도" value={lastAttempt ? formatAgo(lastAttempt, now) : "—"} />
      </section>

      <section aria-label="최저가 근접 상품" className="card flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">수집 기간 최저가 근접 상품</h2>
        {nearLow.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            현재가가 수집 기간 최저가의 +{NEAR_LOW_PCT}% 이내인 상품이 없습니다.
          </p>
        ) : (
          <ProductTable items={nearLow} now={now} />
        )}
      </section>

      <section aria-label="주의 필요" className="card flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">주의 필요</h2>
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

      <Link href="/products" className="self-start rounded-full px-4 py-2 text-sm text-accent ring-1 ring-inset ring-accent/40 hover:bg-accent/10">
        전체 상품 보기 →
      </Link>
    </>
  );
}
