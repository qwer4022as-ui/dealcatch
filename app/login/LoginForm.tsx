"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="token" className="text-sm font-medium">
        관리자 토큰
      </label>
      <input
        id="token"
        name="token"
        type="password"
        required
        autoComplete="current-password"
        className="rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          ✕ {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
