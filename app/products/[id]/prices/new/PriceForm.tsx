"use client";

import Link from "next/link";
import { useActionState } from "react";
import { priceDefaults } from "@/lib/capture/prefill";
import { useCapturedPayload } from "@/lib/capture/useCapturedPayload";
import { formatKRW } from "@/lib/format";
import { recordPricesAction, type PriceFormState } from "./actions";

export interface PriceFormVariant {
  listingVariantId: number;
  optionLabel: string;
  latestPrice: number | null;
}

const STOCK_OPTIONS = [
  { value: "in_stock", label: "판매중" },
  { value: "low", label: "품절 임박" },
  { value: "sold_out", label: "품절" },
  { value: "unknown", label: "모름" },
];
const inputClass =
  "w-full rounded-md px-2 py-1 text-sm tabular-nums ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700";

export function PriceForm({
  productId,
  listingId,
  variants,
  defaultCollectedAt,
  listingUrl,
}: {
  productId: number;
  listingId: number;
  /** 북마클릿 값의 상품 URL 이 이 판매처와 같을 때만 미리 채운다 */
  listingUrl: string;
  variants: PriceFormVariant[];
  defaultCollectedAt: string;
}) {
  const action = recordPricesAction.bind(null, { productId, listingId });
  const [state, formAction, pending] = useActionState<PriceFormState, FormData>(action, {
    errors: [],
    bigChanges: [],
    values: {},
  });
  const captured = useCapturedPayload();
  const sameListing = captured.payload !== null && captured.payload.url === listingUrl;
  const prefill = sameListing && captured.payload ? priceDefaults(captured.payload, variants) : null;
  const submitted = Object.keys(state.values).length > 0;
  const values = submitted ? state.values : (prefill?.values ?? {});
  const val = (name: string, fallback = "") => values[name] ?? fallback;

  return (
    <form key={JSON.stringify(values)} action={formAction} className="flex flex-col gap-4">
      {prefill && !submitted && (
        <div className="rounded-md bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          ⓘ 무신사 페이지에서 가져온 가격을 채웠습니다. 화면과 같은지 확인한 뒤 저장하세요.
          {prefill.unmatched.length > 0 && (
            <div className="mt-1 text-xs">등록되지 않은 옵션: {prefill.unmatched.join(", ")}</div>
          )}
        </div>
      )}
      {captured.payload && !sameListing && (
        <div role="alert" className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          ◐ 가져온 상품이 이 판매처와 달라서 값을 채우지 않았습니다.
        </div>
      )}
      {captured.error && (
        <div role="alert" className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          ◐ {captured.error}
        </div>
      )}
      {state.errors.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <ul className="list-inside list-disc space-y-1">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {state.bigChanges.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {state.bigChanges.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex max-w-xs flex-col gap-1">
        <label htmlFor="collectedAt" className="text-sm font-medium">
          확인 시각 (KST) *
        </label>
        <input
          id="collectedAt"
          name="collectedAt"
          type="datetime-local"
          required
          defaultValue={val("collectedAt", defaultCollectedAt)}
          className={inputClass}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-3 font-medium">옵션</th>
              <th className="py-2 pr-3 font-medium">직전 판매가</th>
              <th className="py-2 pr-3 font-medium">정가</th>
              <th className="py-2 pr-3 font-medium">판매가</th>
              <th className="py-2 font-medium">재고</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.listingVariantId} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2 pr-3">{v.optionLabel}</td>
                <td className="py-2 pr-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                  {v.latestPrice !== null ? formatKRW(v.latestPrice) : "—"}
                </td>
                <td className="py-2 pr-3">
                  <input
                    name={`list_${v.listingVariantId}`}
                    inputMode="numeric"
                    aria-label={`${v.optionLabel} 정가`}
                    defaultValue={val(`list_${v.listingVariantId}`)}
                    className={inputClass}
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    name={`sale_${v.listingVariantId}`}
                    inputMode="numeric"
                    aria-label={`${v.optionLabel} 판매가`}
                    defaultValue={val(`sale_${v.listingVariantId}`)}
                    className={inputClass}
                  />
                </td>
                <td className="py-2">
                  <select
                    name={`stock_${v.listingVariantId}`}
                    aria-label={`${v.optionLabel} 재고`}
                    defaultValue={val(`stock_${v.listingVariantId}`, "in_stock")}
                    className={inputClass}
                  >
                    {STOCK_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.bigChanges.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirmBigChange" />
          위 가격 변동이 맞습니다 (직전 기록보다 50% 넘게 차이)
        </label>
      )}

      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        ⓘ 실제로 확인한 가격만 입력하세요. 과거 가격을 추정해서 입력하지 마세요. 판매가를 비운 옵션은 저장하지 않습니다.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <Link href={`/products/${productId}`} className="self-center text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400">
          취소
        </Link>
      </div>
    </form>
  );
}
