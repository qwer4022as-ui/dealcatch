"use client";

import { useActionState } from "react";
import { setTargetAction, type TargetState } from "@/app/products/[id]/alert/actions";
import { formatKRW } from "@/lib/format";

/** 상세 화면의 목표가 설정 (관리자 전용, 샘플 제외) */
export function TargetPriceForm({
  productId,
  target,
  hit,
  cheapest,
}: {
  productId: number;
  target: number | null;
  /** 목표가에 도달한 옵션 (없으면 null) */
  hit: { label: string; price: number } | null;
  /** 판매 중인 옵션의 최저 현재가 */
  cheapest: number | null;
}) {
  const [state, formAction, pending] = useActionState<TargetState, FormData>(setTargetAction.bind(null, productId), {
    error: null,
  });
  return (
    <section
      aria-label="가격 알림"
      className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/[0.05] px-5 py-4 text-sm lg:flex-row lg:items-center lg:gap-6"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="flex items-center gap-2 whitespace-nowrap text-lg font-bold">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="currentColor" aria-hidden>
              <path d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6Zm-2.5 17a2.5 2.5 0 0 0 5 0z" />
            </svg>
            가격 알림
          </h2>
          <p className="text-xs text-zinc-400">
            목표가를 설정하면 판매 중인 옵션이 그 가격 이하일 때 대시보드 알림에 표시됩니다.
          </p>
        </div>
        {target !== null && (
          <p className="text-xs">
            현재 목표가 <strong className="tabular-nums text-zinc-50">{formatKRW(target)}</strong> ·{" "}
            {hit ? (
              <span className="font-medium text-emerald-300">● 목표가 도달 ({hit.label} {formatKRW(hit.price)})</span>
            ) : cheapest !== null ? (
              <span className="text-zinc-400">
                현재 최저 {formatKRW(cheapest)} · {formatKRW(cheapest - target)} 더 내려가야 함
              </span>
            ) : (
              <span className="text-zinc-400">아직 가격 기록이 없습니다</span>
            )}
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-xs text-red-300">
            ✕ {state.error}
          </p>
        )}
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <label htmlFor="target" className="whitespace-nowrap text-xs text-zinc-300">
          목표가
        </label>
        <input
          id="target"
          name="target"
          inputMode="numeric"
          defaultValue={target ?? ""}
          placeholder="예: 79,000"
          className="w-44 rounded-xl bg-zinc-950/70 px-3 py-2 tabular-nums text-zinc-50 ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:outline-none focus:ring-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-5 py-2 font-semibold text-zinc-950 hover:bg-accent-strong disabled:opacity-60"
        >
          저장
        </button>
        {target !== null && (
          <button type="submit" name="clear" value="1" disabled={pending} className="whitespace-nowrap text-xs text-zinc-400 underline underline-offset-2">
            목표가 지우기
          </button>
        )}
      </form>
    </section>
  );
}
