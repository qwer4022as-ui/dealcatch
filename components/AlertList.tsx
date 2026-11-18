import Link from "next/link";
import { formatAgo, formatKRW } from "@/lib/format";
import { NEW_LOW_DAYS, type NewLow, type TargetHit } from "@/lib/pricing/alerts";

/** 대시보드 알림 (관리자 전용) */
export function AlertList({ targetHits, newLows, now }: { targetHits: TargetHit[]; newLows: NewLow[]; now: Date }) {
  return (
    <section aria-label="가격 알림" className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-base font-semibold">가격 알림</h2>
      {targetHits.length === 0 && newLows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          목표가에 도달하거나 최근 {NEW_LOW_DAYS}일 안에 최저가를 갱신한 상품이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {targetHits.map((h) => (
            <li key={`t-${h.productId}`} className="flex flex-wrap gap-x-2">
              <span className="font-medium text-emerald-800 dark:text-emerald-300">● 목표가 도달</span>
              <Link href={`/products/${h.productId}`} className="underline-offset-2 hover:underline">
                {h.name}
              </Link>
              <span className="text-zinc-600 dark:text-zinc-400">
                {h.label} {formatKRW(h.price)} (목표 {formatKRW(h.target)})
              </span>
            </li>
          ))}
          {newLows.map((n) => (
            <li key={`n-${n.productId}`} className="flex flex-wrap gap-x-2">
              <span className="font-medium text-sky-800 dark:text-sky-300">▼ 최저가 갱신</span>
              <Link href={`/products/${n.productId}`} className="underline-offset-2 hover:underline">
                {n.name}
              </Link>
              <span className="text-zinc-600 dark:text-zinc-400">
                {n.label} {formatKRW(n.price)} · {formatAgo(n.at, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
