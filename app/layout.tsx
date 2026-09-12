import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "주식 관리 대시보드",
  description: "보유 종목, 손익 현황, 포트폴리오 통계를 한눈에 확인하는 주식 관리 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
