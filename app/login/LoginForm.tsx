"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const field =
  "flex items-center gap-2 rounded-xl bg-zinc-950/60 px-3 ring-1 ring-inset ring-zinc-700 focus-within:ring-2 focus-within:ring-accent";
const input = "min-w-0 flex-1 bg-transparent py-2.5 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none";
const icon = "h-4 w-4 shrink-0 text-zinc-400";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [show, setShow] = useState(false);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="id" className="text-sm font-medium text-zinc-200">
          아이디
        </label>
        <div className={field}>
          <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
          </svg>
          <input id="id" name="id" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="아이디" className={input} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-200">
          비밀번호
        </label>
        <div className={field}>
          <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="비밀번호"
            className={input}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-pressed={show}
            className="whitespace-nowrap rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {show ? "숨기기" : "보기"}
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/30">
          ✕ {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-zinc-950 hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
