/**
 * app/layout.tsx
 *
 * 애플리케이션 루트 레이아웃.
 *
 * [역할]
 * - 전역 폰트(Geist Sans / Mono) 및 CSS 적용
 * - <html lang="ko"> 설정 (한국어 접근성)
 * - react-hot-toast Toaster 전역 배치 (bottom-center, 3초 표시)
 *
 * [(shop) 그룹과 admin 그룹은 각자의 layout.tsx 에서 추가 레이아웃을 적용한다]
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'MoGuWai Super',
    template: '%s | MoGuWai Super',
  },
  description: '미니멀 모던 쇼핑몰 — MoGuWai Super',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: 'light' }}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
