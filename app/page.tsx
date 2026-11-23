import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/Badge";
import { HeroArt } from "@/components/HeroArt";
import { AlertList } from "@/components/AlertList";
import { CheckList, type CheckRow } from "@/components/CheckList";
import { ProductTable } from "@/components/ProductTable";
import { SampleBanner } from "@/components/SampleBanner";
import { StatCard, StatIcons } from "@/components/StatCard";
import { healthBadge } from "@/lib/pricing/labels";
import { NEAR_LOW_PCT, isNearLow } from "@/lib/pricing/summary";
import { isAdmin } from "@/lib/auth/admin";
import { NEW_LOW_DAYS, evaluateAlerts } from "@/lib/pricing/alerts";
import { buildCheckList } from "@/lib/pricing/checklist";
import { kstDateKey, kstStartOfDay } from "@/lib/pricing/kst";
import { CHANGE_DAYS, TREND_DAYS, averagePct, changePct, dailyLowSeries } from "@/lib/pricing/trend";
import { listStats } from "@/lib/products/filter";
import { getTargets } from "@/lib/repositories/alerts";
import { listCheckTargets, listProducts, listTrendPoints } from "@/lib/repositories/product-list";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEAR_LOW_SHOW = 5;
const ATTENTION_SHOW = 8;

export default function DashboardPage(props: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <section className="relative grid items-center gap-6 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-3">
          <p className="hero-fade text-sm font-medium text-zinc-300">의류 가격 추적 서비스</p>
          <h1 className="hero-fade text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl xl:text-5xl">
            <span className="whitespace-nowrap">내가 담은 옷,</span>{" "}
            <span className="hero-shine whitespace-nowrap">최저가로!</span>
          </h1>
          <p className="hero-fade-2 text-sm leading-relaxed text-zinc-300 sm:text-base">
            등록한 상품의 가격 변화를 매일 기록하고
            <br />
            가장 좋은 구매 타이밍을 놓치지 마세요.
          </p>
        </div>
        <HeroArt />
      </section>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <Dashboard {...props} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ searchParams }: PageProps<"/">) {
  await connection();
  const now = new Date();
  const { recorded } = await searchParams;
  const recordedId = Number(Array.isArray(recorded) ? recorded[0] : recorded) || null;

  const [items, admin, targets] = await Promise.all([listProducts(undefined, now), isAdmin(), listCheckTargets()]);
  const checkList = buildCheckList(targets, now);
  const trend = dailyLowSeries(await listTrendPoints(targets.map((t) => t.listingId), kstStartOfDay(now, TREND_DAYS - 1)), now);
  const today = kstDateKey(now);
  const created = new Map(items.map((p) => [p.id, p.createdAt.getTime()]));

  const rows: CheckRow[] = targets.map((t) => {
    const series = trend.get(t.listingId) ?? Array<number | null>(TREND_DAYS).fill(null);
    return {
      ...t,
      createdAt: created.get(t.productId) ?? 0,
      lastSuccessAt: t.lastSuccessAt?.getTime() ?? null,
      recordedToday: t.lastSuccessAt !== null && kstDateKey(t.lastSuccessAt) === today,
      current: series.findLast((v) => v !== null) ?? null,
      change: changePct(series),
      series,
    };
  });

  const alerts = admin
    ? evaluateAlerts(
        await getTargets().then((targetPrices) =>
          items.map((p) => ({
            productId: p.id,
            name: `${p.brandName} ${p.name}`,
            isSample: p.isSample,
            targetPrice: targetPrices.get(p.id) ?? null,
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

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">추적 중인 상품이 없습니다.</p>;
  }

  const stats = listStats(items, now);
  const newThisWeek = items.filter((p) => now.getTime() - p.createdAt.getTime() <= 7 * DAY_MS).length;
  const total = checkList.due.length + checkList.doneToday;
  const donePct = total ? Math.round((checkList.doneToday / total) * 100) : 0;
  const avgChange = averagePct(rows.map((r) => r.change));
  const up = (n: number, text: string) => (
    <span className={n > 0 ? "text-emerald-400" : "text-zinc-500"}>
      {n > 0 && <span aria-hidden>▲ </span>}+{n} <span className="text-zinc-400">({text})</span>
    </span>
  );

  return (
    <>
      {items.some((p) => p.isSample) && <SampleBanner />}

      <section aria-label="요약" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={StatIcons.hanger} label="등록된 상품" value={items.length} aside={up(newThisWeek, "최근 7일")} />
        <StatCard
          icon={StatIcons.tag}
          label="최저가 갱신"
          value={stats.recentNewLow}
          aside={up(stats.newLowToday, "오늘")}
          note={`최근 ${NEW_LOW_DAYS}일 수집 기간 최저가 갱신`}
        />
        <StatCard icon={StatIcons.check} label="오늘 기록 완료율" value={donePct} unit="%">
          <div className="mt-1 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800"
              role="progressbar"
              aria-label="오늘 기록 완료율"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={checkList.doneToday}
            >
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${donePct}%` }} />
            </div>
            <span className="whitespace-nowrap text-xs tabular-nums text-zinc-400">
              {checkList.doneToday} / {total}
            </span>
          </div>
        </StatCard>
        <StatCard
          icon={StatIcons.chart}
          label={`평균 가격 변동률 (${CHANGE_DAYS}일)`}
          value={avgChange === null ? "—" : `${avgChange > 0 ? "+" : avgChange < 0 ? "−" : ""}${Math.abs(avgChange).toFixed(1)}`}
          unit={avgChange === null ? "" : "%"}
          valueClass={avgChange === null ? "text-zinc-400" : avgChange < 0 ? "text-emerald-400" : avgChange > 0 ? "text-red-400" : "text-zinc-50"}
          aside={avgChange !== null && avgChange !== 0 && <span className={avgChange < 0 ? "text-emerald-400" : "text-red-400"}>{avgChange < 0 ? "↓" : "↑"}</span>}
          note={avgChange === null ? `${CHANGE_DAYS}일 전 기록이 쌓이면 표시됩니다` : `${CHANGE_DAYS}일 전과 비교 가능한 판매처 평균`}
        />
      </section>

      {alerts && <AlertList targetHits={alerts.targetHits} newLows={alerts.newLows} now={now} />}

      {admin && <CheckList rows={rows} nowMs={now.getTime()} recordedId={recordedId} />}

      <section aria-label="최저가 근접 상품" className="card flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">수집 기간 최저가 근접 상품 <span className="text-sm font-normal text-zinc-400">({nearLow.length}개)</span></h2>
        {nearLow.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            현재가가 수집 기간 최저가의 +{NEAR_LOW_PCT}% 이내인 상품이 없습니다.
          </p>
        ) : (
          <>
            <ProductTable items={nearLow.slice(0, NEAR_LOW_SHOW)} now={now} />
            {nearLow.length > NEAR_LOW_SHOW && (
              <Link href="/products?view=near" className="self-start text-sm text-accent underline-offset-2 hover:underline">
                최저가 근접 상품 {nearLow.length}개 모두 보기 →
              </Link>
            )}
          </>
        )}
      </section>

      <section aria-label="주의 필요" className="card flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">주의 필요 <span className="text-sm font-normal text-zinc-400">({attention.length}개)</span></h2>
        {attention.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">수집 실패나 오래된 데이터가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.slice(0, ATTENTION_SHOW).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge label={healthBadge(p.summary, now)} />
                <Link href={`/products/${p.id}`} className="underline-offset-2 hover:underline">
                  {p.brandName} {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {attention.length > ATTENTION_SHOW && (
          <p className="text-xs text-zinc-400">외 {attention.length - ATTENTION_SHOW}개 · 오늘 기록하면 목록에서 빠집니다</p>
        )}
      </section>

      <Link href="/products" className="self-start rounded-full px-4 py-2 text-sm text-accent ring-1 ring-inset ring-accent/40 hover:bg-accent/10">
        전체 상품 보기 →
      </Link>
    </>
  );
}
