import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가격추적",
  description: "의류 가격 변동 추적 및 할인 분석",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
