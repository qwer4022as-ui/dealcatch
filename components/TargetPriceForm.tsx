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
    <section aria-label="가격 알림" className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h2 className="text-base font-semibold">가격 알림</h2>
      {target !== null && (
        <p>
          목표가 {formatKRW(target)} ·{" "}
          {hit ? (
            <span className="font-medium text-emerald-800 dark:text-emerald-300">
              ● 목표가 도달 ({hit.label} {formatKRW(hit.price)})
            </span>
          ) : cheapest !== null ? (
            <span className="text-zinc-600 dark:text-zinc-400">현재 최저 {formatKRW(cheapest)} · {formatKRW(cheapest - target)} 더 내려가야 함</span>
          ) : (
            <span className="text-zinc-600 dark:text-zinc-400">아직 가격 기록이 없습니다</span>
          )}
        </p>
      )}
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <label htmlFor="target" className="text-xs text-zinc-600 dark:text-zinc-400">
          목표가
        </label>
        <input
          id="target"
          name="target"
          inputMode="numeric"
          defaultValue={target ?? ""}
          placeholder="예: 79,000"
          className="w-32 rounded-md px-2 py-1 tabular-nums ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          저장
        </button>
        {target !== null && (
          <button type="submit" name="clear" value="1" disabled={pending} className="text-xs underline underline-offset-2">
            목표가 지우기
          </button>
        )}
      </form>
      {state.error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          ✕ {state.error}
        </p>
      )}
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        판매 중인 옵션 중 하나라도 현재가가 목표가 이하가 되면 대시보드 알림에 표시됩니다. 최근 7일 안의 수집 기간 최저가 갱신은 따로 설정하지 않아도 표시됩니다.
      </p>
    </section>
  );
}
