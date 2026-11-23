import Link from "next/link";
import { ShowMore } from "@/components/ShowMore";
import { formatAgo, formatKRW } from "@/lib/format";
import { NEW_LOW_DAYS, type NewLow, type TargetHit } from "@/lib/pricing/alerts";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-500 group-hover:text-zinc-200" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Row({ href, tag, tagClass, name, label, price, meta }: {
  href: string; tag: string; tagClass: string; name: string; label: string; price: number; meta: string;
}) {
  return (
    <li>
      <Link href={href} className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2 hover:bg-zinc-800/60">
        <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tagClass}`}>{tag}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">{name}</span>
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="whitespace-nowrap text-lg font-bold tabular-nums text-accent">{formatKRW(price)}</span>
        <span className="whitespace-nowrap text-xs tabular-nums text-zinc-400">{meta}</span>
        <Chevron />
      </Link>
    </li>
  );
}

/** 대시보드 알림 (관리자 전용) */
const ALERT_SHOW = 3;

export function AlertList({ targetHits, newLows, now }: { targetHits: TargetHit[]; newLows: NewLow[]; now: Date }) {
  const total = targetHits.length + newLows.length;
  const empty = total === 0;
  return (
    <section
      aria-label="가격 알림"
      className={`flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent/[0.06] p-4 shadow-[0_0_40px_-12px_rgb(185_164_255/0.35)] sm:flex-row ${
        total > 1 ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <h2 className="flex shrink-0 items-center gap-2 px-2 py-2 text-lg font-bold">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="currentColor" aria-hidden>
          <path d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6Zm-2.5 17a2.5 2.5 0 0 0 5 0z" />
        </svg>
        가격 알림
        {total > 0 && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">{total}</span>
        )}
      </h2>
      {empty ? (
        <p className="px-2 text-sm text-zinc-400">
          목표가에 도달하거나 최근 {NEW_LOW_DAYS}일 안에 최저가를 갱신한 상품이 없습니다.
        </p>
      ) : (
        <ShowMore
          initial={ALERT_SHOW}
          items={[
            ...targetHits.map((h) => (
              <Row
                key={`t-${h.productId}`}
                href={`/products/${h.productId}`}
                tag="● 목표가 도달"
                tagClass="bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                name={h.name}
                label={h.label}
                price={h.price}
                meta={`목표 ${formatKRW(h.target)}`}
              />
            )),
            ...newLows.map((n) => (
              <Row
                key={`n-${n.productId}`}
                href={`/products/${n.productId}`}
                tag="▼ 최저가 갱신"
                tagClass="bg-accent/15 text-accent ring-accent/30"
                name={n.name}
                label={n.label}
                price={n.price}
                meta={formatAgo(n.at, now)}
              />
            )),
          ]}
        />
      )}
    </section>
  );
}
