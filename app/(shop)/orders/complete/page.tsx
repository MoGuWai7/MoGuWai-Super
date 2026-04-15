/**
 * app/(shop)/orders/complete/page.tsx
 *
 * 주문 완료 페이지 (/orders/complete?id=<orderId>).
 *
 * [동작]
 * - 주문 생성 성공 후 checkout-form 에서 이 페이지로 리다이렉트
 * - orderId(searchParams.id)가 없거나, 본인 주문이 아니면 홈으로 리다이렉트
 * - 주문 상품 목록 / 배송지 / 결제 정보 표시
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircle, Package, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { OrderItemWithProduct, ShippingAddress } from '@/types'

export const metadata: Metadata = { title: '주문 완료' }

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function OrderCompletePage({ searchParams }: PageProps) {
  const { id } = await searchParams
  if (!id) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 본인 주문만 조회 (user_id 필터 필수)
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, created_at, shipping_address,
      order_items (
        id, quantity, price_at_order,
        products (id, name, thumbnail_url)
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) redirect('/')

  const addr = order.shipping_address as ShippingAddress

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

      {/* 완료 아이콘 + 제목 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16
          rounded-full bg-emerald-50 mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">주문이 완료되었습니다!</h1>
        <p className="text-sm text-zinc-500 mt-2">
          주문번호:{' '}
          <span className="font-mono font-semibold text-zinc-700">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </p>
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
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {item.products?.name ?? '상품 정보 없음'}
                </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">배송지 정보</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-zinc-400 w-14 shrink-0">받는 분</dt>
              <dd className="font-medium text-zinc-900">{addr?.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-400 w-14 shrink-0">연락처</dt>
              <dd className="text-zinc-700">{addr?.phone}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-400 w-14 shrink-0">주소</dt>
              <dd className="text-zinc-700">
                [{addr?.zip}] {addr?.address1}
                {addr?.address2 && `, ${addr.address2}`}
              </dd>
            </div>
          </dl>
        </div>

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

      {/* CTA 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/mypage/orders"
          className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-lg
            bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          주문 내역 보기
          <ChevronRight className="w-4 h-4" />
        </Link>
        <Link
          href="/products"
          className="flex-1 h-11 flex items-center justify-center rounded-lg
            border border-zinc-300 text-sm font-medium text-zinc-700
            hover:bg-zinc-100 transition-colors"
        >
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  )
}
