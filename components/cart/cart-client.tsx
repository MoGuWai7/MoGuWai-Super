/**
 * components/cart/cart-client.tsx  ('use client')
 *
 * 장바구니 페이지의 인터랙티브 영역.
 *
 * [초기 데이터]
 * cart/page.tsx(Server Component)에서 DB 조회 후 initialItems 로 전달받는다.
 * 이후 수량 변경/삭제는 낙관적 UI(즉시 state 업데이트) + API 호출 방식으로 처리한다.
 *
 * [API 호출]
 * - 수량 변경: PATCH /api/cart/[id]
 * - 단건 삭제: DELETE /api/cart/[id]
 * - 전체 삭제: DELETE /api/cart
 *
 * [반응형]
 * 데스크탑: 우측 고정 주문 요약 패널
 * 모바일:   하단 고정 결제 바
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag, Minus, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

type CartProduct = {
  id: string
  name: string
  price: number
  stock: number
  thumbnail_url: string | null
  status: string
}

type CartItemData = {
  id: string
  quantity: number
  created_at: string
  products: CartProduct | null
}

interface CartClientProps {
  initialItems: CartItemData[]
}

export default function CartClient({ initialItems }: CartClientProps) {
  const [items, setItems] = useState<CartItemData[]>(initialItems)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const total = items.reduce((sum, item) => {
    if (!item.products) return sum
    return sum + item.products.price * item.quantity
  }, 0)

  async function updateQuantity(id: string, quantity: number) {
    console.log('[CartClient:updateQuantity] 수량 변경 시작', { cartItemId: id, newQuantity: quantity })
    if (quantity < 1) {
      console.log('[CartClient:updateQuantity] 수량 1 미만 — 조기 반환')
      return
    }
    setLoading(id)
    try {
      console.log('[CartClient:updateQuantity] PATCH /api/cart/:id 요청', { cartItemId: id, quantity })
      const res = await fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      console.log('[CartClient:updateQuantity] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) throw new Error()
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
      console.log('[CartClient:updateQuantity] 낙관적 상태 업데이트 완료, router.refresh() 호출')
      router.refresh()
    } catch {
      console.error('[CartClient:updateQuantity] 수량 변경 실패')
      toast.error('수량 변경에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  async function removeItem(id: string) {
    console.log('[CartClient:removeItem] 단건 삭제 시작', { cartItemId: id })
    setLoading(id)
    try {
      console.log('[CartClient:removeItem] DELETE /api/cart/:id 요청', { cartItemId: id })
      const res = await fetch(`/api/cart/${id}`, { method: 'DELETE' })
      console.log('[CartClient:removeItem] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((item) => item.id !== id))
      console.log('[CartClient:removeItem] 상태에서 항목 제거 완료')
      toast.success('상품을 삭제했습니다.')
      router.refresh()
    } catch {
      console.error('[CartClient:removeItem] 단건 삭제 실패', { cartItemId: id })
      toast.error('삭제에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  async function clearCart() {
    console.log('[CartClient:clearCart] 전체 삭제 시작')
    if (!confirm('장바구니를 모두 비우시겠습니까?')) {
      console.log('[CartClient:clearCart] 사용자 취소')
      return
    }
    setLoading('all')
    try {
      console.log('[CartClient:clearCart] DELETE /api/cart 요청')
      const res = await fetch('/api/cart', { method: 'DELETE' })
      console.log('[CartClient:clearCart] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) throw new Error()
      setItems([])
      console.log('[CartClient:clearCart] 전체 삭제 성공, 상태 초기화')
      toast.success('장바구니를 비웠습니다.')
      router.refresh()
    } catch {
      console.error('[CartClient:clearCart] 전체 삭제 실패')
      toast.error('전체 삭제에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  /* 빈 장바구니 */
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center gap-6 py-24">
          <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-zinc-300" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-900">장바구니가 비어있습니다.</p>
            <p className="mt-1 text-sm text-zinc-500">마음에 드는 상품을 담아보세요.</p>
          </div>
          <Link
            href="/products"
            className="h-11 px-6 rounded-lg bg-zinc-900 text-white text-sm font-medium
              hover:bg-zinc-700 transition-colors"
          >
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">
          장바구니
          <span className="ml-2 text-base font-normal text-zinc-400">{items.length}개</span>
        </h1>
        <button
          onClick={clearCart}
          disabled={loading === 'all'}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-500
            disabled:opacity-40 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          전체 삭제
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 상품 목록 */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {items.map((item) => {
            const product = item.products
            if (!product) return null
            const isUpdating = loading === item.id

            return (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm
                  transition-opacity"
                style={{ opacity: isUpdating ? 0.6 : 1 }}
              >
                {/* 썸네일 */}
                <Link href={`/products/${product.id}`} className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-zinc-100">
                    {product.thumbnail_url ? (
                      <Image
                        src={product.thumbnail_url}
                        alt={product.name}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-zinc-300" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* 상품 정보 */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* 상품명 + 삭제 버튼 */}
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-zinc-600
                        transition-colors line-clamp-2"
                    >
                      {product.name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={isUpdating}
                      aria-label="삭제"
                      className="flex-shrink-0 p-1 rounded-md text-zinc-400
                        hover:text-red-500 hover:bg-zinc-100
                        disabled:opacity-40 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 단가 */}
                  <p className="text-xs text-zinc-400">
                    단가 {product.price.toLocaleString('ko-KR')}원
                  </p>

                  {/* 수량 조절 + 소계 */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isUpdating}
                        className="w-8 h-8 flex items-center justify-center text-zinc-500
                          hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed
                          transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-9 text-center text-sm font-medium text-zinc-900 select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= product.stock || isUpdating}
                        className="w-8 h-8 flex items-center justify-center text-zinc-500
                          hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed
                          transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-zinc-900">
                      {(product.price * item.quantity).toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 주문 요약 (데스크탑) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-zinc-900">주문 요약</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">상품 금액</span>
                <span className="text-zinc-700">{total.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">배송비</span>
                <span className="text-emerald-600 font-medium">무료</span>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900">총 금액</span>
              <span className="text-xl font-bold text-zinc-900">
                {total.toLocaleString('ko-KR')}원
              </span>
            </div>

            <Link
              href="/checkout"
              className="w-full h-11 flex items-center justify-center rounded-lg
                bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              주문하기
            </Link>

            <Link
              href="/products"
              className="w-full h-11 flex items-center justify-center rounded-lg
                border border-zinc-300 text-sm font-medium text-zinc-700
                hover:bg-zinc-100 transition-colors"
            >
              쇼핑 계속하기
            </Link>
          </div>
        </div>
      </div>

      {/* 모바일 하단 고정 결제 바 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400">총 결제금액</p>
          <p className="text-base font-bold text-zinc-900">{total.toLocaleString('ko-KR')}원</p>
        </div>
        <Link
          href="/checkout"
          className="h-11 px-6 rounded-lg bg-zinc-900 text-white text-sm font-medium
            hover:bg-zinc-700 transition-colors whitespace-nowrap"
        >
          주문하기
        </Link>
      </div>
    </div>
  )
}
