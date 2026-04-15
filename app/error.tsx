/**
 * app/error.tsx
 *
 * 전역 런타임 에러 바운더리. 렌더 중 예외가 발생하면 Next.js가 이 페이지를 보여준다.
 * reset() 으로 재시도, 홈으로 돌아가기 버튼을 제공한다.
 * Client Component — error/reset 콜백을 받으려면 반드시 'use client' 가 필요하다.
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">
          오류가 발생했습니다
        </h1>
        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          일시적인 오류가 발생했습니다.<br />
          잠시 후 다시 시도해주세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg
              bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg
              border border-zinc-300 text-zinc-700 text-sm font-medium
              hover:bg-zinc-100 transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로 가기
          </Link>
        </div>
      </div>
    </div>
  )
}
