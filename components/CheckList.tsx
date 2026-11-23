"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GarmentIcon } from "@/components/GarmentIcon";
import { Sparkline } from "@/components/Sparkline";
import { formatAgo, formatKRW, formatKstDate, formatSignedPct } from "@/lib/format";

/** 서버에서 만든 한 줄 (판매처 = 색상 페이지 하나). 시각은 ms 숫자로 넘긴다 */
export interface CheckRow {
  listingId: number;
  productId: number;
  brandName: string;
  productName: string;
  modelNo: string | null;
  platformName: string;
  color: string;
  url: string;
  variantCount: number;
  /** 상품 등록 시각 */
  createdAt: number;
  lastSuccessAt: number | null;
  recordedToday: boolean;
  /** 최근 30일 중 가장 최근 기록의 최저 판매가 */
  current: number | null;
  /** 7일 변동률. 비교할 기록이 없으면 null */
  change: number | null;
  /** 최근 30일 일별 최저 판매가 */
  series: (number | null)[];
}

type Status = "all" | "due" | "done";
type Change = "all" | "down" | "up" | "flat" | "none";
type Sort = "oldest" | "newest" | "change" | "name";

const PAGE = 20;

const selectClass =
  "appearance-none rounded-xl bg-zinc-900 py-2 pl-4 pr-9 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-800 focus:outline-none focus:ring-accent";

function Select<T extends string>({ label, value, onChange, options }: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${selectClass} ${value !== options[0][0] ? "text-accent ring-accent/60" : ""}`}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="text-xs text-zinc-500" title="7일 전 기록이 없어 비교하지 않습니다">
        비교 불가
      </span>
    );
  const [cls, mark] =
    value < 0
      ? ["bg-emerald-500/10 text-emerald-300 ring-emerald-400/40", "▼"]
      : value > 0
        ? ["bg-red-500/10 text-red-300 ring-red-400/40", "▲"]
        : ["bg-zinc-800 text-zinc-300 ring-zinc-600", "—"];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset ${cls}`}>
      <span aria-hidden>{mark}</span>
      {value === 0 ? "0.0%" : formatSignedPct(value)}
    </span>
  );
}

const btn = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium";

/** 관리자 전용: 판매처별 오늘 기록 여부 + 검색·필터·정렬 */
export function CheckList({ rows, nowMs, recordedId }: { rows: CheckRow[]; nowMs: number; recordedId: number | null }) {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [change, setChange] = useState<Change>("all");
  const [sort, setSort] = useState<Sort>("oldest");
  const [limit, setLimit] = useState(PAGE);
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const brands = useMemo(() => [...new Set(rows.map((r) => r.brandName))].sort((a, b) => a.localeCompare(b, "ko")), [rows]);
  const done = rows.filter((r) => r.recordedToday).length;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (!term || `${r.brandName} ${r.productName} ${r.modelNo ?? ""} ${r.color}`.toLowerCase().includes(term)) &&
        (brand === "all" || r.brandName === brand) &&
        (status === "all" || (status === "done") === r.recordedToday) &&
        (change === "all" ||
          (change === "none" ? r.change === null : r.change !== null && (change === "down" ? r.change < 0 : change === "up" ? r.change > 0 : r.change === 0))),
    );
    const last = (r: CheckRow) => r.lastSuccessAt ?? -Infinity;
    out.sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.createdAt - a.createdAt || b.listingId - a.listingId;
        case "change":
          return (a.change ?? Infinity) - (b.change ?? Infinity);
        case "name":
          return `${a.brandName} ${a.productName}`.localeCompare(`${b.brandName} ${b.productName}`, "ko");
        default: // 미기록 먼저, 오래된 기록 순
          return Number(a.recordedToday) - Number(b.recordedToday) || last(a) - last(b) || a.listingId - b.listingId;
      }
    });
    return out;
  }, [rows, q, brand, status, change, sort]);

  const filtered = q.trim() !== "" || brand !== "all" || status !== "all" || change !== "all";
  const reset = () => {
    setQ("");
    setBrand("all");
    setStatus("all");
    setChange("all");
    setLimit(PAGE);
  };
  if (rows.length === 0) return null;

  return (
    <section id="check" aria-label="오늘 확인할 상품" className="card flex scroll-mt-20 flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <svg viewBox="0 0 28 24" className="h-5 w-6 text-accent" fill="currentColor" aria-hidden>
            <path d="M9 4 4 7l2 4 3-1.5V20h10V9.5l3 1.5 2-4-5-3c-.6 1.6-2.2 2.5-4 2.5S9.6 5.6 9 4Z" />
          </svg>
          오늘 확인할 상품
        </h2>
        <p className="text-sm text-zinc-300">
          {done === rows.length ? (
            "● 오늘 모두 기록했습니다"
          ) : (
            <>
              남은 <strong className="text-zinc-50">{rows.length - done}개</strong> · 오늘 기록{" "}
              <strong className="tabular-nums text-zinc-50">
                {done}/{rows.length}
              </strong>
            </>
          )}
        </p>
      </div>
      <p className="-mt-2 text-xs text-zinc-400">
        무신사 페이지를 열고 북마클릿을 누르면 가격 입력 화면이 채워집니다. 저장하면 이 목록으로 돌아와 상태가 바뀝니다.
      </p>

      {recordedId !== null && rows.some((r) => r.listingId === recordedId && r.recordedToday) && (
        <p role="status" className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
          ✓ 가격을 저장했습니다. 해당 상품이 &lsquo;기록 완료&rsquo;로 바뀌었습니다.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-xl bg-zinc-900 px-3 ring-1 ring-inset ring-zinc-700 focus-within:ring-accent lg:max-w-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span className="sr-only">상품명, 브랜드, 모델번호 검색</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="상품명, 브랜드, 모델번호 검색"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={reset}
          aria-pressed={!filtered}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-inset ${
            filtered ? "text-zinc-200 ring-zinc-700 hover:bg-zinc-800" : "bg-accent/20 text-accent ring-accent/50"
          }`}
        >
          전체
        </button>
        <Select label="브랜드" value={brand} onChange={setBrand} options={[["all", "브랜드"] as const, ...brands.map((b) => [b, b] as const)]} />
        <Select<Status> label="상태" value={status} onChange={setStatus} options={[["all", "상태"], ["due", "미기록"], ["done", "기록 완료"]]} />
        <Select<Change>
          label="가격 변동"
          value={change}
          onChange={setChange}
          options={[["all", "가격 변동"], ["down", "하락"], ["up", "상승"], ["flat", "변동 없음"], ["none", "비교 불가"]]}
        />
        <div className="ml-auto">
          <Select<Sort>
            label="정렬"
            value={sort}
            onChange={setSort}
            options={[["oldest", "정렬: 미기록·오래된 순"], ["newest", "정렬: 등록일 최신순"], ["change", "정렬: 변동률 낮은 순"], ["name", "정렬: 이름순"]]}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">조건에 맞는 상품이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-left text-xs text-zinc-400">
              <tr>
                <th className="w-full whitespace-nowrap px-4 py-3 font-medium">상품 정보</th>
                <th className="hidden whitespace-nowrap px-3 py-3 text-right font-medium xl:table-cell">옵션</th>
                <th className="whitespace-nowrap px-3 py-3 text-right font-medium">현재가</th>
                <th className="hidden whitespace-nowrap px-3 py-3 text-center font-medium sm:table-cell">변동률 (7일)</th>
                <th className="hidden whitespace-nowrap px-3 py-3 font-medium lg:table-cell">가격 추이 (30일)</th>
                <th className="hidden whitespace-nowrap px-3 py-3 text-center font-medium xl:table-cell">마지막 기록</th>
                <th className="hidden whitespace-nowrap px-3 py-3 font-medium sm:table-cell">상태</th>
                <th className="px-4 py-3">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {shown.slice(0, limit).map((r) => {
                const last = r.lastSuccessAt !== null ? new Date(r.lastSuccessAt) : null;
                return (
                  <tr
                    key={r.listingId}
                    className={`transition-colors hover:bg-zinc-800/30 ${r.listingId === recordedId ? "bg-emerald-500/[0.06]" : ""}`}
                  >
                    <td className="w-full min-w-40 max-w-0 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <GarmentIcon name={r.productName} color={r.color} />
                        <div className="min-w-0">
                          <Link
                            href={`/products/${r.productId}`}
                            title={`${r.brandName} ${r.productName}`}
                            className="block truncate font-semibold text-zinc-50 underline-offset-2 hover:underline"
                          >
                            {r.brandName} {r.productName}
                          </Link>
                          <div className="truncate text-xs text-zinc-400">
                            {[r.platformName, r.color, r.modelNo].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-zinc-200 xl:table-cell">{r.variantCount}개</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-zinc-50">
                      {r.current !== null ? formatKRW(r.current) : "—"}
                    </td>
                    <td className="hidden px-3 py-2.5 text-center sm:table-cell">
                      <ChangeBadge value={r.change} />
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <Sparkline width={112} values={r.series} label={`최근 30일 가격 추이, 기록 ${r.series.filter((v) => v !== null).length}일`} />
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-center text-xs tabular-nums xl:table-cell">
                      {last ? (
                        <>
                          <div className="text-zinc-100">{formatAgo(last, now)}</div>
                          <div className="text-zinc-500">({formatKstDate(last)})</div>
                        </>
                      ) : (
                        <span className="text-zinc-500">기록 없음</span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 sm:table-cell">
                      {r.recordedToday ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/40">
                          <span aria-hidden>✓</span> 기록 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-400/40">
                          <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400" /> 미기록
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col items-end gap-1.5 md:flex-row md:justify-end md:gap-2">
                        <a href={r.url} target="_blank" rel="noreferrer" className={`${btn} text-zinc-200 ring-1 ring-inset ring-zinc-600 hover:bg-zinc-800`}>
                          {r.platformName} 열기 ↗
                        </a>
                        {r.recordedToday ? (
                          <Link
                            href={`/products/${r.productId}/prices/new?listing=${r.listingId}&from=dashboard`}
                            title="오늘 이미 기록했습니다. 다시 입력하려면 누르세요."
                            className={`${btn} bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700 hover:text-zinc-200`}
                          >
                            ✓ 입력 완료
                          </Link>
                        ) : (
                          <Link
                            href={`/products/${r.productId}/prices/new?listing=${r.listingId}&from=dashboard`}
                            className={`${btn} bg-accent font-semibold text-zinc-950 hover:bg-accent-strong`}
                          >
                            가격 입력
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="self-center rounded-xl px-5 py-2 text-sm text-zinc-200 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-800"
        >
          더 보기 ({shown.length - limit}개 남음)
        </button>
      )}
    </section>
  );
}
