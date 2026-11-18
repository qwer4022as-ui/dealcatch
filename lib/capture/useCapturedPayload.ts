"use client";

import { useEffect, useState } from "react";
import { decodeCapture, type CapturePayload } from "./payload";

const STORE_KEY = "capture-last";
const STORE_TTL_MS = 10 * 60 * 1000;

export interface CapturedState {
  payload: CapturePayload | null;
  error: string | null;
  /** 값을 어디서 읽었는지: 주소의 #d=... 또는 이 탭에 잠시 보관한 값 */
  source: "hash" | "stored" | null;
}

/**
 * 주소의 #d=... 를 한 번 읽어 검증하고, 새로고침 시 다시 적용되지 않게 해시를 지운다.
 * 읽은 값은 이 탭(sessionStorage)에 10분간 보관해, 등록 → 가격 입력처럼 서버를 거친 다음 화면에서
 * useStored 로 한 번 더 쓸 수 있게 한다. 서버로는 보내지 않는다.
 */
export function useCapturedPayload(options: { useStored?: boolean } = {}): CapturedState {
  const { useStored = false } = options;
  const [state, setState] = useState<CapturedState>({ payload: null, error: null, source: null });

  useEffect(() => {
    const m = window.location.hash.match(/^#d=([A-Za-z0-9_-]+)$/);
    if (m) {
      const r = decodeCapture(m[1]);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (r.ok) {
        try {
          sessionStorage.setItem(STORE_KEY, JSON.stringify({ e: m[1], t: Date.now() }));
        } catch {}
      }
      // 마운트 후 한 번만 외부(주소) 값을 상태로 옮긴다
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(r.ok ? { payload: r.value, error: null, source: "hash" } : { payload: null, error: r.error, source: "hash" });
      return;
    }
    if (!useStored) return;
    let stored: { e?: unknown; t?: unknown } | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "null");
      sessionStorage.removeItem(STORE_KEY); // 한 번만 쓴다
    } catch {}
    if (!stored || typeof stored.e !== "string" || typeof stored.t !== "number") return;
    if (Date.now() - stored.t > STORE_TTL_MS) return;
    const r = decodeCapture(stored.e);
    if (r.ok) setState({ payload: r.value, error: null, source: "stored" });
  }, [useStored]);

  return state;
}
