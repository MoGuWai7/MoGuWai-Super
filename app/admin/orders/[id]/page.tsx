/**
 * app/admin/orders/[id]/page.tsx
 *
 * 어드민 주문 상세 페이지.
 *
 * [구성]
 * - 주문 헤더: 주문번호, 주문일, 현재 상태 배지
 * - 상태 변경: OrderStatusSelect 클라이언트 컴포넌트 (PATCH /api/admin/orders/[id])
 * - 주문 상품 목록: 썸네일 + 상품명 + 수량/단가 + 소계
 * - 결제 정보: 상품 합계 / 배송비 / 최종 결제금액
 * - 배송지 정보: 수령인·연락처·주소
 * - 주문자 정보: 이름·이메일 (users 테이블 join)
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import OrderStatusSelect from './order-status-select'
import type { OrderStatus, OrderItemWithProduct, ShippingAddress } from '@/types'
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: '주문 상세' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // orders + users + order_items + products 4단 join
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      users!orders_user_id_fkey(name, email),
      order_items(
        id, quantity, price_at_order,
        products(id, name, thumbnail_url)
      )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const badge = ORDER_STATUS_BADGE[order.status as OrderStatus] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
  const label = ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status
  const addr = order.shipping_address as ShippingAddress

  return (
    <div className="p-6 lg:p-8 max-w-4xl">

      {/* 뒤로가기 */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500
          hover:text-zinc-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        주문 목록으로
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
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
          {label}
        </span>
      </div>

      {/* 상태 변경 (클라이언트 컴포넌트) */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-4">
        <OrderStatusSelect orderId={order.id} currentStatus={order.status as OrderStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 주문 상품 목록 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">주문 상품</h2>
            </div>
            {order.order_items?.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-zinc-400">
                <Package className="w-8 h-8 mb-2" />
                <p className="text-sm">상품 정보 없음</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(order.order_items as OrderItemWithProduct[]).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    {/* 썸네일 */}
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0 overflow-hidden">
                      {item.products?.thumbnail_url ? (
                        <img
                          src={item.products.thumbnail_url}
                          alt={item.products.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-zinc-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {item.products?.name ?? '삭제된 상품'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {item.price_at_order.toLocaleString('ko-KR')}원 × {item.quantity}개
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
                      {(item.price_at_order * item.quantity).toLocaleString('ko-KR')}원
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 우측: 결제 정보 + 배송지 + 주문자 */}
        <div className="space-y-4">

          {/* 결제 금액 */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">결제 정보</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>상품 합계</span>
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

          {/* 배송지 정보 */}
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

          {/* 주문자 정보 */}
          {order.users && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">주문자 정보</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="text-zinc-400 w-14 shrink-0">이름</dt>
                  <dd className="font-medium text-zinc-900">{(order.users as any).name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-400 w-14 shrink-0">이메일</dt>
                  <dd className="text-zinc-700 truncate">{(order.users as any).email}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
