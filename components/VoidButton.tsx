"use client";

import { useActionState } from "react";
import { voidSnapshotAction, type VoidState } from "@/app/products/[id]/void/actions";

/** 관리자에게만 렌더링한다. 펼치면 사유 입력 → 무효 처리 (되돌릴 수 없음) */
export function VoidButton(props: { productId: number; listingVariantId: number; snapshotId: number }) {
  const [state, formAction, pending] = useActionState<VoidState, FormData>(voidSnapshotAction.bind(null, props), {
    error: null,
  });
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400">무효 처리</summary>
      <form action={formAction} className="mt-1 flex flex-col gap-1">
        <input
          name="reason"
          required
          minLength={2}
          maxLength={200}
          placeholder="사유 (예: 판매가 오타)"
          aria-label="무효 처리 사유"
          className="rounded px-2 py-1 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
        />
        {state.error && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            ✕ {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-red-700 px-2 py-1 text-white disabled:opacity-60 dark:bg-red-600"
        >
          {pending ? "처리 중…" : "무효 처리 (되돌릴 수 없음)"}
        </button>
      </form>
    </details>
  );
}
