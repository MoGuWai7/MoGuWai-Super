/**
 * app/admin/orders/page.tsx
 *
 * 어드민 주문 관리 목록 페이지.
 *
 * [기능]
 * - 상태별 탭 필터 (전체 / 주문완료 / 결제확인 / ... / 취소)
 * - 주문 테이블: 주문번호 · 주문자 · 상품명 · 금액 · 상태 배지 · 주문일 · 상세 링크
 *
 * [데이터]
 * orders + users(join) + order_items > products(join) 을 한 번에 조회.
 * 필터는 searchParams.status 로 서버에서 처리 (URL: /admin/orders?status=pending).
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: '주문 관리' }

// 상태 탭 목록 (빈 문자열 = 전체)
const STATUS_TABS = [
  { value: '',                 label: '전체' },
  { value: 'pending',          label: '주문완료' },
  { value: 'payment_confirmed',label: '결제확인' },
  { value: 'preparing',        label: '배송준비' },
  { value: 'shipping',         label: '배송중' },
  { value: 'delivered',        label: '배송완료' },
  { value: 'cancelled',        label: '취소' },
]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status = '' } = await searchParams

  const supabase = await createClient()

  // 주문 목록 조회 (상태 필터 적용)
  let query = supabase
    .from('orders')
    .select(`
      id, status, total_price, created_at, shipping_address,
      users!orders_user_id_fkey(name, email),
      order_items(
        products(name)
      )
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status as OrderStatus)
  }

  const { data: orders } = await query

  return (
    <div className="p-6 lg:p-8">

      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">주문 관리</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          총 <span className="font-medium text-zinc-700">{orders?.length ?? 0}건</span>의 주문
        </p>
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex gap-1 flex-wrap mb-6 border-b border-zinc-200 pb-0">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          const href = tab.value ? `/admin/orders?status=${tab.value}` : '/admin/orders'
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
                ${isActive
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* 주문 테이블 */}
      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-12 h-12 text-zinc-200 mb-3" />
          <p className="text-sm text-zinc-400">해당 조건의 주문이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">주문번호</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">주문자</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">상품명</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">총 금액</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">주문일</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(orders as any[]).map((order) => {
                  const firstProduct = order.order_items?.[0]?.products?.name ?? '—'
                  const extraCount = (order.order_items?.length ?? 1) - 1
                  const buyer = order.users
                  const badge = ORDER_STATUS_BADGE[order.status as OrderStatus] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  const label = ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500 whitespace-nowrap">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-zinc-900">
                          {buyer?.name ?? order.shipping_address?.name ?? '—'}
                        </p>
                        <p className="text-xs text-zinc-400">{buyer?.email ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-700">
                          {firstProduct}
                          {extraCount > 0 && (
                            <span className="ml-1 text-xs text-zinc-400">외 {extraCount}개</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 whitespace-nowrap">
                        {order.total_price.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${badge}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                          상세
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
