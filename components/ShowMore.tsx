"use client";

import { useId, useState, type ReactNode } from "react";

const chevron = (up: boolean) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-4 w-4 ${up ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const btn =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm ring-1 ring-inset";

/**
 * 목록을 처음 `initial`개만 보여 주고, "더 보기"를 누를 때마다 `step`개씩 늘린다.
 * 한 번이라도 펼쳤으면 "접기"로 처음 상태로 돌아간다.
 * items 는 서버에서 그린 <li> 들이다.
 */
export function ShowMore({ items, initial = 3, step = 20, unit = "개", className = "" }: {
  items: ReactNode[];
  initial?: number;
  step?: number;
  unit?: string;
  className?: string;
}) {
  const [count, setCount] = useState(initial);
  const id = useId();
  const remaining = Math.max(items.length - count, 0);
  const next = Math.min(step, remaining);
  const expanded = count > initial;

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${className}`}>
      <ul id={id} className="flex flex-col gap-1 text-sm">
        {items.slice(0, count)}
      </ul>
      {(remaining > 0 || expanded) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setCount((c) => c + step)}
              aria-controls={id}
              className={`${btn} text-accent ring-accent/40 hover:bg-accent/10`}
            >
              {next}
              {unit} 더 보기
              <span className="text-xs text-zinc-400">
                (남은 {remaining}
                {unit})
              </span>
              {chevron(false)}
            </button>
          )}
          {expanded && (
            <button
              type="button"
              onClick={() => setCount(initial)}
              aria-controls={id}
              className={`${btn} text-zinc-300 ring-zinc-600 hover:bg-zinc-800`}
            >
              접기
              {chevron(true)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
