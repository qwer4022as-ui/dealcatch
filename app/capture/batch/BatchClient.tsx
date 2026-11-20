"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { decodeBatch, type BatchItem } from "@/lib/capture/batch";
import { formatKRW } from "@/lib/format";
import { toKstLocal } from "@/lib/forms/prices";
import { recordBatchAction, resolveBatchAction, type BatchMatch, type BatchSaveState } from "./actions";

const PENDING_KEY = "capture-batch-pending";
const inputClass =
  "w-28 rounded-md px-2 py-1 text-sm tabular-nums ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700";

type Loaded = { items: BatchItem[]; matches: BatchMatch[] };

export function BatchClient() {
  const [message, setMessage] = useState<string | null>("가져온 정보를 확인하는 중…");
  const [needLogin, setNeedLogin] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let encoded = window.location.hash.match(/^#b=([A-Za-z0-9_-]+)$/)?.[1] ?? null;
    if (encoded) {
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      try {
        encoded = sessionStorage.getItem(PENDING_KEY);
      } catch {}
    }
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {}
    if (!encoded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("가져온 정보가 없습니다. 무신사 목록 페이지에서 '일괄 기록' 북마클릿을 눌러 주세요.");
      return;
    }
    const decoded = decodeBatch(encoded);
    if (!decoded.ok) {
      setMessage(decoded.error);
      return;
    }
    const data = encoded;
    resolveBatchAction(decoded.items.map((i) => i.externalId)).then((r) => {
      if (r.status === "login") {
        try {
          sessionStorage.setItem(PENDING_KEY, data); // 로그인 후 이어서 처리
        } catch {}
        setNeedLogin(true);
        setMessage("관리자 로그인이 필요합니다.");
      } else if (r.status === "error") {
        setMessage(r.message);
      } else {
        setMessage(null);
        setLoaded({ items: decoded.items, matches: r.matches });
      }
    });
  }, []);

  if (!loaded) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p role="status">{message}</p>
        {needLogin && (
          <Link href="/login?next=%2Fcapture%2Fbatch" className="w-fit underline underline-offset-2">
            로그인하고 계속하기 →
          </Link>
        )}
      </div>
    );
  }
  return <BatchForm {...loaded} />;
}

function BatchForm({ items, matches }: Loaded) {
  const [state, formAction, pending] = useActionState<BatchSaveState, FormData>(recordBatchAction, {
    errors: [],
    bigChanges: [],
    values: {},
  });
  const itemById = new Map(items.map((i) => [i.externalId, i]));
  const matched = matches
    .map((m) => ({ m, item: itemById.get(m.externalId) }))
    .filter((x): x is { m: BatchMatch; item: BatchItem } => x.item !== undefined);
  const matchedIds = new Set(matches.map((m) => m.externalId));
  const unmatched = items.filter((i) => !matchedIds.has(i.externalId));
  const submitted = Object.keys(state.values).length > 0;
  const val = (name: string, fallback: string) => (submitted ? (state.values[name] ?? "") : fallback);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        페이지에서 상품 {items.length}개를 읽었고, 그중 등록된 판매처 {matched.length}개를 찾았습니다.
      </p>

      {matched.length > 0 && (
        <form key={JSON.stringify(state.values)} action={formAction} className="flex flex-col gap-4">
          {state.errors.length > 0 && (
            <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              <ul className="list-inside list-disc space-y-1">
                {state.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              {state.bigChanges.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {state.bigChanges.slice(0, 20).map((c) => (
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
              defaultValue={val("collectedAt", toKstLocal(new Date()))}
              className="rounded-md px-2 py-1 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
            />
          </div>

          <input type="hidden" name="row_count" value={matched.length} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium">기록</th>
                  <th className="py-2 pr-3 font-medium">판매처</th>
                  <th className="py-2 pr-3 text-right font-medium">직전 판매가</th>
                  <th className="py-2 pr-3 font-medium">정가</th>
                  <th className="py-2 pr-3 font-medium">판매가</th>
                  <th className="py-2 font-medium">재고</th>
                </tr>
              </thead>
              <tbody>
                {matched.map(({ m, item }, i) => (
                  <tr key={m.listingId} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3">
                      <input type="hidden" name={`row_${i}_listing`} value={m.listingId} />
                      <input
                        type="checkbox"
                        name={`row_${i}_on`}
                        aria-label={`${m.label} 기록`}
                        defaultChecked={submitted ? state.values[`row_${i}_on`] === "on" : item.salePrice !== null}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Link href={`/products/${m.productId}`} className="underline-offset-2 hover:underline">
                        {m.label}
                      </Link>
                      <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">옵션 {m.variantCount}개</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {m.previousPrice !== null ? formatKRW(m.previousPrice) : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        name={`row_${i}_list`}
                        inputMode="numeric"
                        aria-label={`${m.label} 정가`}
                        defaultValue={val(`row_${i}_list`, item.listPrice !== null ? String(item.listPrice) : "")}
                        className={inputClass}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        name={`row_${i}_sale`}
                        inputMode="numeric"
                        aria-label={`${m.label} 판매가`}
                        defaultValue={val(`row_${i}_sale`, item.salePrice !== null ? String(item.salePrice) : "")}
                        className={inputClass}
                      />
                    </td>
                    <td className="py-2">
                      <select
                        name={`row_${i}_stock`}
                        aria-label={`${m.label} 재고`}
                        defaultValue={val(`row_${i}_stock`, item.soldOut === true ? "sold_out" : "unknown")}
                        className="rounded-md px-2 py-1 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
                      >
                        <option value="unknown">모름</option>
                        <option value="in_stock">판매중</option>
                        <option value="low">품절 임박</option>
                        <option value="sold_out">품절</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.bigChanges.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmBigChange" />위 가격 변동이 맞습니다 (직전 기록보다 50% 넘게 차이)
            </label>
          )}
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            ⓘ 판매처(색상)마다 같은 가격을 모든 사이즈 옵션에 기록합니다. 무신사 화면과 같은지 확인한 뒤 저장하세요. 재고는 목록에서
            알 수 없으면 &quot;모름&quot;입니다.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-fit rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "저장 중…" : "체크한 판매처 모두 저장"}
          </button>
        </form>
      )}

      {unmatched.length > 0 && (
        <section className="flex flex-col gap-1 text-sm">
          <h2 className="text-base font-semibold">등록되지 않은 상품 ({unmatched.length}개)</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            추적하려면 상품 페이지를 열고 기존 &quot;무신사 → 가격추적&quot; 북마클릿으로 등록하세요.
          </p>
          <ul className="flex flex-col gap-0.5">
            {unmatched.slice(0, 50).map((u) => (
              <li key={u.externalId}>
                <a href={`https://www.musinsa.com/products/${u.externalId}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {[u.brand, u.name].filter(Boolean).join(" ") || u.externalId} ↗
                </a>
                {u.salePrice !== null && <span className="ml-2 text-xs text-zinc-500">{formatKRW(u.salePrice)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
