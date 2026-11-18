import Link from "next/link";
import { formatAgo } from "@/lib/format";
import type { CheckList as CheckListData } from "@/lib/pricing/checklist";

const SHOW = 20;

/** 관리자 전용: 오늘 아직 가격을 기록하지 않은 판매처 */
export function CheckList({ data, now }: { data: CheckListData; now: Date }) {
  const total = data.due.length + data.doneToday;
  if (total === 0) return null;

  return (
    <section aria-label="오늘 확인할 상품" className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">오늘 확인할 상품</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {data.due.length === 0 ? "● 오늘 모두 기록했습니다" : `남은 ${data.due.length}개 · 오늘 기록 ${data.doneToday}/${total}`}
        </p>
      </div>
      {data.due.length > 0 && (
        <>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            무신사 페이지를 열고 북마클릿을 누르면 가격 입력 화면이 채워집니다. 확인 후 저장하세요.
          </p>
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
            {data.due.slice(0, SHOW).map((t) => (
              <li key={t.listingId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Link href={`/products/${t.productId}`} className="min-w-0 flex-1 underline-offset-2 hover:underline">
                  {t.brandName} {t.productName}
                  <span className="ml-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {t.platformName}
                    {t.color && ` · ${t.color}`}
                  </span>
                </Link>
                <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                  {t.lastSuccessAt ? `마지막 기록 ${formatAgo(t.lastSuccessAt, now)}` : "기록 없음"}
                </span>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md px-2 py-0.5 text-xs ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                >
                  {t.platformName} 열기 ↗
                </a>
                <Link
                  href={`/products/${t.productId}/prices/new?listing=${t.listingId}`}
                  className="rounded-md px-2 py-0.5 text-xs ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                >
                  가격 입력
                </Link>
              </li>
            ))}
          </ul>
          {data.due.length > SHOW && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">외 {data.due.length - SHOW}개</p>
          )}
        </>
      )}
    </section>
  );
}
