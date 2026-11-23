import Link from "next/link";
import { GarmentIcon } from "@/components/GarmentIcon";
import { formatAgo } from "@/lib/format";
import type { CheckList as CheckListData } from "@/lib/pricing/checklist";

const SHOW = 20;

/** 관리자 전용: 오늘 아직 가격을 기록하지 않은 판매처 */
export function CheckList({ data, now }: { data: CheckListData; now: Date }) {
  const total = data.due.length + data.doneToday;
  if (total === 0) return null;

  return (
    <section aria-label="오늘 확인할 상품" className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg viewBox="0 0 28 24" className="h-5 w-6 text-accent" fill="currentColor" aria-hidden>
              <path d="M9 4 4 7l2 4 3-1.5V20h10V9.5l3 1.5 2-4-5-3c-.6 1.6-2.2 2.5-4 2.5S9.6 5.6 9 4Z" />
            </svg>
            오늘 확인할 상품
          </h2>
          {data.due.length > 0 && (
            <p className="text-xs text-zinc-400">
              무신사 페이지를 열고 북마클릿을 누르면 가격 입력 화면이 채워집니다. 확인 후 저장하세요.
            </p>
          )}
        </div>
        <div className="flex min-w-48 flex-col items-end gap-1.5">
          <p className="text-sm text-zinc-300">
            {data.due.length === 0 ? (
              "● 오늘 모두 기록했습니다"
            ) : (
              <>
                남은 <strong className="text-zinc-50">{data.due.length}개</strong> · 오늘 기록{" "}
                <strong className="tabular-nums text-zinc-50">
                  {data.doneToday}/{total}
                </strong>
              </>
            )}
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-label="오늘 기록 진행률"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={data.doneToday}
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${(data.doneToday / total) * 100}%` }} />
          </div>
        </div>
      </div>
      {data.due.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-zinc-800/80 border-t border-zinc-800/80">
            {data.due.slice(0, SHOW).map((t) => (
              <li key={t.listingId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 text-sm">
                <GarmentIcon name={t.productName} color={t.color} />
                <Link href={`/products/${t.productId}`} className="min-w-0 flex-1 font-medium text-zinc-100 underline-offset-2 hover:underline">
                  {t.brandName} {t.productName}
                </Link>
                <span className="w-32 text-xs text-zinc-400">
                  {t.platformName}
                  {t.color && ` · ${t.color}`}
                </span>
                <span className="w-28 text-right text-xs tabular-nums text-zinc-400">
                  {t.lastSuccessAt ? `마지막 기록 ${formatAgo(t.lastSuccessAt, now)}` : "기록 없음"}
                </span>
                <div className="flex gap-2">
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-inset ring-zinc-600 hover:bg-zinc-800"
                  >
                    {t.platformName} 열기 ↗
                  </a>
                  <Link
                    href={`/products/${t.productId}/prices/new?listing=${t.listingId}`}
                    className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-accent"
                  >
                    가격 입력
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {data.due.length > SHOW && <p className="text-xs text-zinc-400">외 {data.due.length - SHOW}개</p>}
        </>
      )}
    </section>
  );
}
