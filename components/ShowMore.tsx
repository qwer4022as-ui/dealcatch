"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * 목록을 처음 `initial`개만 보여 주고 "더 보기 / 접기"로 펼친다.
 * items 는 서버에서 그린 <li> 들이다.
 */
export function ShowMore({ items, initial = 3, unit = "개", className = "" }: {
  items: ReactNode[];
  initial?: number;
  unit?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hidden = items.length - initial;
  const shown = open || hidden <= 0 ? items : items.slice(0, initial);

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${className}`}>
      <ul id={id} className="flex flex-col gap-1 text-sm">
        {shown}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="mt-1 inline-flex items-center gap-1.5 self-center rounded-full px-4 py-1.5 text-sm text-accent ring-1 ring-inset ring-accent/40 hover:bg-accent/10"
        >
          {open ? "접기" : `${hidden}${unit} 더 보기`}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
