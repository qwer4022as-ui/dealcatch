"use client";

import { useEffect, useState } from "react";
import { decodeCapture, type CapturePayload } from "./payload";

/** 주소의 #d=... 를 한 번 읽어 검증하고, 새로고침 시 다시 적용되지 않게 해시를 지운다 */
export function useCapturedPayload(): { payload: CapturePayload | null; error: string | null } {
  const [state, setState] = useState<{ payload: CapturePayload | null; error: string | null }>({
    payload: null,
    error: null,
  });
  useEffect(() => {
    const m = window.location.hash.match(/^#d=([A-Za-z0-9_-]+)$/);
    if (!m) return;
    const r = decodeCapture(m[1]);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    // 마운트 후 한 번만 외부(주소) 값을 상태로 옮긴다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(r.ok ? { payload: r.value, error: null } : { payload: null, error: r.error });
  }, []);
  return state;
}
