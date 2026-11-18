"use client";

import { useEffect } from "react";

export default function ProductError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    process.env.NODE_ENV === "development" && error instanceof Error ? error.message : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 py-8">
      <h1 className="text-xl font-semibold">가격 정보를 불러오지 못했습니다</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        데이터베이스 연결이나 환경변수 설정을 확인해 주세요.
      </p>
      {message && (
        <pre className="overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-900">{message}</pre>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="w-fit rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-800"
      >
        다시 시도
      </button>
    </main>
  );
}
