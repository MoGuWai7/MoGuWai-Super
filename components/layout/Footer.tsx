/**
 * components/layout/Footer.tsx
 *
 * 쇼핑몰 하단 푸터 컴포넌트. (shop) 레이아웃에 포함된다.
 * 저작권 연도를 동적으로 표시한다.
 */

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-zinc-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-tight text-zinc-900">
            MoGuWai Super
          </p>
          <p className="text-xs text-zinc-400">
            © {year} MoGuWai Super. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
