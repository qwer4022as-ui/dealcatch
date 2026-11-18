"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { decodeCapture } from "@/lib/capture/payload";
import { resolveCaptureAction } from "./actions";

const STORAGE_KEY = "capture-pending";

export function CaptureClient() {
  const router = useRouter();
  const [message, setMessage] = useState("가져온 정보를 확인하는 중…");
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    let encoded = window.location.hash.match(/^#d=([A-Za-z0-9_-]+)$/)?.[1] ?? null;
    if (!encoded) {
      try {
        encoded = sessionStorage.getItem(STORAGE_KEY);
      } catch {}
    }
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (!encoded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("가져온 정보가 없습니다. 무신사 상품 페이지에서 북마클릿을 눌러 주세요.");
      return;
    }
    const decoded = decodeCapture(encoded);
    if (!decoded.ok) {
      setMessage(decoded.error);
      return;
    }
    const data = encoded;
    resolveCaptureAction(decoded.value.externalId).then((r) => {
      if (r.status === "login") {
        try {
          sessionStorage.setItem(STORAGE_KEY, data); // 로그인 후 이어서 처리
        } catch {}
        setNeedLogin(true);
        setMessage("관리자 로그인이 필요합니다.");
      } else if (r.status === "existing") {
        router.replace(`/products/${r.productId}/prices/new?listing=${r.listingId}#d=${data}`);
      } else if (r.status === "new") {
        router.replace(`/products/new#d=${data}`);
      } else {
        setMessage(r.message);
      }
    });
  }, [router]);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p role="status">{message}</p>
      {needLogin && (
        <Link href="/login?next=%2Fcapture" className="w-fit underline underline-offset-2">
          로그인하고 계속하기 →
        </Link>
      )}
    </div>
  );
}
