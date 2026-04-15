/**
 * app/(shop)/mypage/orders/page.tsx
 *
 * 사용자 마이페이지 > 주문 내역 목록 페이지.
 *
 * [기능]
 * - 상태별 탭 필터 (URL: /mypage/orders?status=pending)
 * - 주문 카드: 주문번호 · 상태 배지 · 상품 썸네일 · 금액
 * - 카드 클릭 시 주문 상세(/mypage/orders/[id])로 이동
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, ShoppingBag, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: '주문 내역' }

// 필터 탭 목록 (빈 문자열 = 전체)
const STATUS_TABS = [
  { value: '',                  label: '전체' },
  { value: 'pending',           label: '주문완료' },
  { value: 'payment_confirmed', label: '결제확인' },
  { value: 'preparing',         label: '배송준비' },
  { value: 'shipping',          label: '배송중' },
  { value: 'delivered',         label: '배송완료' },
  { value: 'cancelled',         label: '취소' },
]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function MypageOrdersPage({ searchParams }: PageProps) {
  const { status = '' } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mypage/orders')

  // 주문 목록 조회 (상태 필터 적용)
  let query = supabase
    .from('orders')
    .select(`
      id, status, total_price, created_at, shipping_address,
      order_items(products(name, thumbnail_url))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status as OrderStatus)

  const { data: orders } = await query

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      {/* 헤더 */}
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500
          hover:text-zinc-900 transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        마이페이지
      </Link>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900">주문 내역</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          총 <span className="font-medium text-zinc-700">{orders?.length ?? 0}건</span>
        </p>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-0 border-b border-zinc-200 mb-5 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const href = tab.value
            ? `/mypage/orders?status=${tab.value}`
            : '/mypage/orders'
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap
                ${status === tab.value
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* 주문 목록 */}
      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <ShoppingBag className="w-12 h-12 text-zinc-200" />
          <p className="text-sm text-zinc-400">
            {status ? '해당 상태의 주문이 없습니다.' : '주문 내역이 없습니다.'}
          </p>
          <Link
            href="/products"
            className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm
              font-medium hover:bg-zinc-700 transition-colors"
          >
            쇼핑하러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(orders as any[]).map((order) => {
            const items = order.order_items ?? []
            const badge = ORDER_STATUS_BADGE[order.status as OrderStatus] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'

            return (
              <Link
                key={order.id}
                href={`/mypage/orders/${order.id}`}
                className="block bg-white rounded-xl border border-zinc-200 p-4
                  hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                {/* 상단: 주문번호 + 날짜 + 상태 */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-zinc-400 shrink-0">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full
                      text-xs font-medium ring-1 shrink-0 ${badge}`}>
                      {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                    })}
                  </span>
                </div>

                {/* 상품 썸네일 + 상품명 */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex -space-x-2">
                    {items.slice(0, 3).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="w-10 h-10 rounded-lg border-2 border-white bg-zinc-100 overflow-hidden shrink-0"
                      >
                        {item.products?.thumbnail_url ? (
                          <img
                            src={item.products.thumbnail_url}
                            alt={item.products?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-zinc-300" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-700 truncate">
                    {items[0]?.products?.name ?? '—'}
                    {items.length > 1 && (
                      <span className="text-zinc-400"> 외 {items.length - 1}개</span>
                    )}
                  </p>
                </div>

                {/* 하단: 금액 + 화살표 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900">
                    {order.total_price.toLocaleString('ko-KR')}원
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
