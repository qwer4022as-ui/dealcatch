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

export function BatchClient({ done = false }: { done?: boolean }) {
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
      setMessage(done ? null : "가져온 정보가 없습니다. 무신사 목록 페이지에서 '일괄 기록' 북마클릿을 눌러 주세요.");
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
  }, [done]);

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
  const checked = (name: string, fallback: boolean) => (submitted ? state.values[name] === "on" : fallback);
  const stockSelect = (name: string, label: string, fallback: string) => (
    <select
      name={name}
      aria-label={`${label} 재고`}
      defaultValue={val(name, fallback)}
      className="rounded-md px-2 py-1 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
    >
      <option value="unknown">모름</option>
      <option value="in_stock">판매중</option>
      <option value="low">품절 임박</option>
      <option value="sold_out">품절</option>
    </select>
  );
  const priceInput = (name: string, label: string, fallback: number | null) => (
    <input
      name={name}
      inputMode="numeric"
      aria-label={label}
      defaultValue={val(name, fallback !== null ? String(fallback) : "")}
      className={inputClass}
    />
  );

  return (
    <form key={JSON.stringify(state.values)} action={formAction} className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        페이지에서 상품 {items.length}개를 읽었습니다. 등록된 판매처 {matched.length}개, 새 상품 {unmatched.length}개입니다.
      </p>

      {state.errors.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <ul className="list-inside list-disc space-y-1">
            {state.errors.slice(0, 20).map((e) => (
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

      {matched.length === 0 && unmatched.length === 0 && (
        <p className="text-sm">이 페이지에서 저장할 상품을 찾지 못했습니다.</p>
      )}

      <input type="hidden" name="row_count" value={matched.length} />
      {matched.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">등록된 판매처 가격 기록 ({matched.length}개)</h2>
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
                      <input type="checkbox" name={`row_${i}_on`} aria-label={`${m.label} 기록`} defaultChecked={checked(`row_${i}_on`, item.salePrice !== null)} />
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
                    <td className="py-2 pr-3">{priceInput(`row_${i}_list`, `${m.label} 정가`, item.listPrice)}</td>
                    <td className="py-2 pr-3">{priceInput(`row_${i}_sale`, `${m.label} 판매가`, item.salePrice)}</td>
                    <td className="py-2">{stockSelect(`row_${i}_stock`, m.label, item.soldOut === true ? "sold_out" : "unknown")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <input type="hidden" name="new_count" value={unmatched.length} />
      {unmatched.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">새 상품 등록 + 가격 기록 ({unmatched.length}개)</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            색상 페이지마다 상품 1개로 등록하고, 사이즈는 구분하지 않고 &quot;전체 옵션&quot; 하나로 기록합니다. 브랜드는 페이지에서
            추정한 값이니 확인해 주세요. 한 번에 100개까지 등록할 수 있습니다.
          </p>
          <div className="flex max-w-md flex-col gap-1">
            <label htmlFor="fallbackBrand" className="text-sm font-medium">
              브랜드가 비어 있는 항목에 쓸 브랜드
            </label>
            <input
              id="fallbackBrand"
              name="fallbackBrand"
              maxLength={50}
              defaultValue={val("fallbackBrand", "")}
              placeholder="예: 피뎁트 모터사이클"
              className="rounded-md px-2 py-1 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium">등록</th>
                  <th className="py-2 pr-3 font-medium">브랜드</th>
                  <th className="py-2 pr-3 font-medium">상품명</th>
                  <th className="py-2 pr-3 font-medium">정가</th>
                  <th className="py-2 pr-3 font-medium">판매가</th>
                  <th className="py-2 font-medium">재고</th>
                </tr>
              </thead>
              <tbody>
                {unmatched.map((u, i) => (
                  <tr key={u.externalId} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3">
                      <input type="hidden" name={`new_${i}_id`} value={u.externalId} />
                      <input
                        type="checkbox"
                        name={`new_${i}_on`}
                        aria-label={`${u.name || u.externalId} 등록`}
                        defaultChecked={checked(`new_${i}_on`, u.salePrice !== null && i < 100)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        name={`new_${i}_brand`}
                        aria-label={`${u.externalId} 브랜드`}
                        maxLength={50}
                        defaultValue={val(`new_${i}_brand`, u.brand)}
                        className="w-32 rounded-md px-2 py-1 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        name={`new_${i}_name`}
                        aria-label={`${u.externalId} 상품명`}
                        maxLength={200}
                        defaultValue={val(`new_${i}_name`, u.name)}
                        className="w-64 rounded-md px-2 py-1 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
                      />
                      <a href={`https://www.musinsa.com/products/${u.externalId}`} target="_blank" rel="noreferrer" className="ml-1 text-xs underline underline-offset-2">
                        ↗
                      </a>
                    </td>
                    <td className="py-2 pr-3">{priceInput(`new_${i}_list`, `${u.externalId} 정가`, u.listPrice)}</td>
                    <td className="py-2 pr-3">{priceInput(`new_${i}_sale`, `${u.externalId} 판매가`, u.salePrice)}</td>
                    <td className="py-2">{stockSelect(`new_${i}_stock`, u.externalId, u.soldOut === true ? "sold_out" : "unknown")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {state.bigChanges.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirmBigChange" />위 가격 변동이 맞습니다 (직전 기록보다 50% 넘게 차이)
        </label>
      )}
      {(matched.length > 0 || unmatched.length > 0) && (
        <>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            ⓘ 판매가는 쿠폰·적립 혜택가가 아닌 판매가입니다. 무신사 화면과 같은지 확인한 뒤 저장하세요. 저장은 한 번에 처리되며, 하나라도
            실패하면 아무것도 저장되지 않습니다.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-fit rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "저장 중…" : "체크한 항목 모두 저장"}
          </button>
        </>
      )}
    </form>
  );
}
