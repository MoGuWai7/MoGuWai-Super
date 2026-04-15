/**
 * app/not-found.tsx
 *
 * 전역 404 페이지. Next.js App Router가 매칭되지 않는 경로에서 자동으로 렌더링한다.
 */

import Link from 'next/link'
import { Home, Search } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 - 페이지를 찾을 수 없습니다' }

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="text-center max-w-sm">
        <p className="text-[8rem] font-black text-zinc-100 leading-none select-none mb-2">
          404
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          요청하신 페이지가 존재하지 않거나<br />
          주소가 변경되었을 수 있습니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg
              bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로 가기
          </Link>
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg
              border border-zinc-300 text-zinc-700 text-sm font-medium
              hover:bg-zinc-100 transition-colors"
          >
            <Search className="w-4 h-4" />
            상품 둘러보기
          </Link>
        </div>
      </div>
    </div>
  )
}
