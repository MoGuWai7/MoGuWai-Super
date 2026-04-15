/**
 * app/admin/page.tsx
 *
 * 어드민 대시보드 메인 페이지 (/admin).
 *
 * [구성]
 * 1. 통계 카드 4개: 총 주문 수 · 총 매출 · 판매 중 상품 · 가입 회원
 * 2. 차트 (DashboardCharts 클라이언트 컴포넌트):
 *    - 최근 7일 일별 매출 라인차트
 *    - 카테고리별 매출 도넛 파이차트
 * 3. 최근 주문 5건 테이블
 *
 * [데이터 조회]
 * Promise.all 로 9개 쿼리를 병렬 실행해 응답 시간을 최소화한다.
 * 차트 데이터는 서버에서 집계(reduce/filter)한 뒤 클라이언트 컴포넌트로 전달.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardCharts from './dashboard-charts'
import type { DailyRevenue, CategoryRevenue } from './dashboard-charts'
import type { OrderStatus } from '@/types'
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: '대시보드' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  // 오늘 신규 회원 수
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { count: totalOrders },
    { count: todayOrders },
    { count: totalProducts },
    { count: totalUsers },
    { count: newUsersToday },
    { data: revenueData },
    { data: recentOrders },
    { data: weekOrders },
    { data: categoryItems },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()).neq('status', 'cancelled'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase.from('orders').select('total_price').neq('status', 'cancelled'),
    supabase.from('orders')
      .select(`id, status, total_price, created_at, shipping_address, order_items(products(name))`)
      .order('created_at', { ascending: false })
      .limit(5),
    // 7일 매출 차트용
    supabase.from('orders')
      .select('total_price, created_at')
      .neq('status', 'cancelled')
      .gte('created_at', sevenDaysAgo.toISOString()),
    // 카테고리별 매출 차트용
    supabase.from('order_items')
      .select('price_at_order, quantity, products(categories(name))'),
  ])

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, o: any) => sum + (o.total_price ?? 0),
    0
  )

  // 7일 일별 매출 집계
  const dailyRevenue: DailyRevenue[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999)
    const revenue = (weekOrders ?? [])
      .filter((o: any) => {
        const t = new Date(o.created_at).getTime()
        return t >= dayStart.getTime() && t <= dayEnd.getTime()
      })
      .reduce((sum: number, o: any) => sum + (o.total_price ?? 0), 0)
    return { date: dateLabel, revenue }
  })

  // 카테고리별 매출 집계
  const catMap: Record<string, number> = {}
  for (const item of categoryItems ?? []) {
    const name = (item.products as any)?.categories?.name ?? '미분류'
    const amount = ((item.price_at_order ?? 0) * (item.quantity ?? 0))
    catMap[name] = (catMap[name] ?? 0) + amount
  }
  const categoryRevenue: CategoryRevenue[] = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const stats = [
    {
      label: '총 주문',
      value: `${(totalOrders ?? 0).toLocaleString('ko-KR')}건`,
      sub: `오늘 ${todayOrders ?? 0}건`,
      icon: ShoppingBag,
      href: '/admin/orders',
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: '총 매출',
      value: `${totalRevenue.toLocaleString('ko-KR')}원`,
      sub: '취소 제외',
      icon: TrendingUp,
      href: '/admin/orders',
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: '판매 중 상품',
      value: `${(totalProducts ?? 0).toLocaleString('ko-KR')}개`,
      sub: 'active 상태',
      icon: Package,
      href: '/admin/products',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: '가입 회원',
      value: `${(totalUsers ?? 0).toLocaleString('ko-KR')}명`,
      sub: `오늘 신규 ${newUsersToday ?? 0}명`,
      icon: Users,
      href: '/admin/users',
      color: 'text-rose-600 bg-rose-50',
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
          })}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300
                hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
              </div>
              <p className="text-xl font-bold text-zinc-900 leading-none mb-1">{s.value}</p>
              <p className="text-xs text-zinc-400">{s.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{s.sub}</p>
            </Link>
          )
        })}
      </div>

      {/* 차트 */}
      <DashboardCharts dailyRevenue={dailyRevenue} categoryRevenue={categoryRevenue} />

      {/* 최근 주문 */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">최근 주문</h2>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            전체 보기
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            주문 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs">주문번호</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs">주문자</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs">상품</th>
                  <th className="text-right px-4 py-2.5 font-medium text-zinc-500 text-xs">금액</th>
                  <th className="text-center px-4 py-2.5 font-medium text-zinc-500 text-xs">상태</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentOrders.map((order: any) => {
                  const firstName = order.order_items?.[0]?.products?.name ?? '—'
                  const extra = (order.order_items?.length ?? 1) - 1
                  const badge = ORDER_STATUS_BADGE[order.status as OrderStatus] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {order.shipping_address?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 text-xs">
                        {firstName}{extra > 0 && ` 외 ${extra}개`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 whitespace-nowrap text-xs">
                        {order.total_price.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${badge}`}>
                          {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
