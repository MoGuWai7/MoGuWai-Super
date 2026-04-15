/**
 * components/layout/header-client.tsx  ('use client')
 *
 * 헤더의 인터랙션 영역 — Header(Server) 로부터 props 를 받아 렌더링한다.
 *
 * [기능]
 * - 검색 입력창 토글 (데스크탑) + 검색 폼 제출 → /products?search=...
 * - 장바구니 아이콘 + 개수 badge
 * - 로그인/로그아웃 + 마이페이지 + 관리자 링크 (데스크탑)
 * - 모바일 햄버거 메뉴 드롭다운
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Search, Menu, X, LogOut, User, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderClientProps {
  user: { email: string } | null
  cartCount: number
  isAdmin: boolean
}

export default function HeaderClient({ user, cartCount, isAdmin }: HeaderClientProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  async function handleLogout() {
    console.log('[HeaderClient:handleLogout] 로그아웃 시작', { userEmail: user?.email })
    const supabase = createClient()
    await supabase.auth.signOut()
    console.log('[HeaderClient:handleLogout] signOut 완료 — 로그인 페이지로 이동')
    router.push('/login')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      const encoded = encodeURIComponent(searchQuery.trim())
      console.log('[HeaderClient:handleSearch] 검색 실행', { query: searchQuery.trim(), url: `/products?search=${encoded}` })
      router.push(`/products?search=${encoded}`)
      setSearchOpen(false)
      setMenuOpen(false)
      setSearchQuery('')
    } else {
      console.log('[HeaderClient:handleSearch] 빈 검색어 — 무시')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* 로고 */}
          <Link
            href="/"
            className="flex-shrink-0 text-lg font-bold tracking-tight text-zinc-900 hover:text-zinc-600 transition-colors"
          >
            MoGuWai Super
          </Link>

          {/* 우측 액션 영역 */}
          <div className="flex items-center gap-1">

            {/* 검색 (데스크탑) */}
            <div className="hidden md:flex items-center">
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색어를 입력하세요"
                    className="w-56 h-9 px-3 rounded-lg border border-zinc-300 text-sm
                      outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  aria-label="검색"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* 장바구니 */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              aria-label="장바구니"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                  flex items-center justify-center rounded-full bg-zinc-900 text-white
                  text-[10px] font-bold leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* 로그인/유저 메뉴 (데스크탑) */}
            <div className="hidden md:flex items-center gap-2 ml-1">
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm
                      font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="max-w-32 truncate">{user.email}</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm
                        font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      관리자
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border
                      border-zinc-300 text-sm font-medium text-zinc-700
                      hover:bg-zinc-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm
                    font-medium hover:bg-zinc-700 transition-colors"
                >
                  로그인
                </Link>
              )}
            </div>

            {/* 모바일 햄버거 버튼 */}
            <button
              className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-900
                hover:bg-zinc-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">

            {/* 모바일 검색 */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 text-sm
                  outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
              />
              <button
                type="submit"
                className="h-10 px-3 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* 모바일 메뉴 링크 */}
            <Link
              href="/products"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-700
                hover:bg-zinc-100 transition-colors"
            >
              상품 목록
            </Link>
            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-700
                hover:bg-zinc-100 transition-colors"
            >
              장바구니
            </Link>

            <hr className="my-2 border-zinc-200" />

            {/* 모바일 로그인/유저 */}
            {user ? (
              <>
                <Link
                  href="/mypage"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm
                    font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm
                      font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    관리자
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm
                    font-medium text-zinc-700 hover:bg-zinc-100 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mx-0 h-10 flex items-center justify-center rounded-lg
                  bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
