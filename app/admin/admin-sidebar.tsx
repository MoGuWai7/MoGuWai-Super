/**
 * app/admin/admin-sidebar.tsx  ('use client')
 *
 * 어드민 사이드바 네비게이션.
 *
 * [기능]
 * - usePathname() 으로 현재 경로를 감지해 활성 메뉴 스타일 적용
 * - exact: true 인 대시보드(/admin)는 정확히 일치할 때만 활성화
 * - 하단에 쇼핑몰로 이동 링크 고정
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  Users,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: '주문 관리', icon: ShoppingBag },
  { href: '/admin/products', label: '상품 관리', icon: Package },
  { href: '/admin/categories', label: '카테고리', icon: Tag },
  { href: '/admin/users', label: '회원 관리', icon: Users },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white min-h-screen sticky top-0 h-screen overflow-y-auto">
      {/* 브랜드 */}
      <div className="px-4 py-5 border-b border-zinc-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Admin</p>
        <h1 className="text-base font-bold text-zinc-900 mt-0.5">MoGuWai Super</h1>
      </div>

      {/* 네비게이션 */}
      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group
                ${isActive
                  ? 'bg-zinc-900/80 backdrop-blur-sm text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-black/[0.06] hover:text-zinc-900'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* 하단: 쇼핑몰 링크 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-100">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500
            hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          쇼핑몰로 이동
        </Link>
      </div>
    </aside>
  )
}
