/**
 * app/(shop)/mypage/orders/[id]/page.tsx
 *
 * 사용자 마이페이지 > 주문 상세 페이지.
 *
 * [기능]
 * - 주문 상태 스텝 표시 (취소 시 별도 UI)
 * - 주문 취소 버튼 (pending / payment_confirmed 상태에서만 노출)
 * - 주문 상품 목록 / 배송지 / 결제 정보
 *
 * [보안]
 * .eq('user_id', user.id) 필터로 본인 주문만 조회 가능.
 */

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, Package, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import OrderCancelButton from './order-cancel-button'
import type { OrderStatus, OrderItemWithProduct, ShippingAddress } from '@/types'
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: '주문 상세' }

interface PageProps {
  params: Promise<{ id: string }>
}

// 주문 완료 기준 스텝 목록 (취소 상태는 별도 처리)
const STEPS = [
  { key: 'pending',           label: '주문완료' },
  { key: 'payment_confirmed', label: '결제확인' },
  { key: 'preparing',         label: '배송준비' },
  { key: 'shipping',          label: '배송중' },
  { key: 'delivered',         label: '배송완료' },
]

export default async function MypageOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 로그인 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mypage/orders')

  // 본인 주문만 조회 (user_id 필터 필수)
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, created_at, shipping_address,
      order_items(
        id, quantity, price_at_order,
        products(id, name, thumbnail_url)
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) notFound()

  const badge = ORDER_STATUS_BADGE[order.status as OrderStatus] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
  const addr = order.shipping_address as ShippingAddress

  const isCancelled = order.status === 'cancelled'
  // 현재 상태가 STEPS 중 몇 번째인지 (취소는 -1 이 됨)
  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status)
  // pending / payment_confirmed 상태만 취소 가능
  const isCancellable = order.status === 'pending' || order.status === 'payment_confirmed'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      {/* 뒤로가기 */}
      <Link
        href="/mypage/orders"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500
          hover:text-zinc-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        주문 내역
      </Link>

      {/* 주문 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <p className="text-xs font-mono text-zinc-400 mb-1">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="text-xl font-bold text-zinc-900">주문 상세</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ring-1 ${badge}`}>
          {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
        </span>
      </div>

      {/* 주문 상태 스텝 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-4">
        {isCancelled ? (
          /* 취소된 주문은 별도 안내 표시 */
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-red-500 text-xs font-bold">✕</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">주문 취소됨</p>
              <p className="text-xs text-zinc-400 mt-0.5">이 주문은 취소 처리되었습니다.</p>
            </div>
          </div>
        ) : (
          /* 진행 중인 주문: 단계별 스텝 바 */
          <div className="flex items-center">
            {STEPS.map((step, idx) => {
              const done = idx < currentStepIdx   // 완료된 단계
              const active = idx === currentStepIdx // 현재 단계
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${done
                        ? 'bg-zinc-900 text-white'
                        : active
                          ? 'bg-zinc-900 text-white ring-4 ring-zinc-200'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}>
                      {done ? <Check className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
                    </div>
                    <span className={`text-xs whitespace-nowrap
                      ${active ? 'font-semibold text-zinc-900' : done ? 'text-zinc-500' : 'text-zinc-300'}`}>
                      {step.label}
                    </span>
                  </div>
                  {/* 단계 사이 연결선 */}
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-5
                      ${idx < currentStepIdx ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 취소 가능한 경우에만 취소 버튼 표시 */}
        {isCancellable && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-end">
            <OrderCancelButton orderId={order.id} />
          </div>
        )}
      </div>

      {/* 주문 상품 목록 */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">주문 상품</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {(order.order_items as unknown as OrderItemWithProduct[]).map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0 overflow-hidden">
                {item.products?.thumbnail_url ? (
                  <img
                    src={item.products.thumbnail_url}
                    alt={item.products?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-zinc-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.products?.id}`}
                  className="text-sm font-medium text-zinc-900 hover:text-zinc-600
                    transition-colors truncate block"
                >
                  {item.products?.name ?? '삭제된 상품'}
                </Link>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {item.price_at_order.toLocaleString('ko-KR')}원 × {item.quantity}개
                </p>
              </div>
              <p className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
                {(item.price_at_order * item.quantity).toLocaleString('ko-KR')}원
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* 배송지 + 결제 정보 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addr && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">배송지 정보</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-zinc-400 w-14 shrink-0">받는 분</dt>
                <dd className="font-medium text-zinc-900">{addr.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-400 w-14 shrink-0">연락처</dt>
                <dd className="text-zinc-700">{addr.phone}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-400 w-14 shrink-0">주소</dt>
                <dd className="text-zinc-700">
                  [{addr.zip}] {addr.address1}
                  {addr.address2 && `, ${addr.address2}`}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">결제 정보</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>상품 금액</span>
              <span>{order.total_price.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>배송비</span>
              <span className="text-emerald-600">무료</span>
            </div>
            <div className="flex justify-between font-semibold text-zinc-900 pt-2 border-t border-zinc-100">
              <span>최종 결제</span>
              <span>{order.total_price.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
