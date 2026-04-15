/**
 * components/products/product-actions.tsx  ('use client')
 *
 * 상품 상세 페이지의 구매 액션 영역.
 *
 * [기능]
 * - 재고 표시 (품절 / 5개 이하 임박 경고 / 정상)
 * - 수량 선택 (1 ~ 재고 상한)
 * - 장바구니 담기: Supabase 를 직접 호출해 upsert (동일 상품이면 수량 합산)
 * - 바로 구매: /checkout?productId=...&quantity=... 로 이동
 *
 * [왜 Supabase 직접 호출?]
 * 장바구니는 Supabase RLS(Row Level Security)로 본인 데이터만 접근 가능하도록
 * 보호되므로, 별도 API Route 없이 클라이언트에서 직접 호출해도 안전하다.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Zap, Minus, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface ProductActionsProps {
  productId: string
  stock: number
  price: number
}

export default function ProductActions({ productId, stock, price }: ProductActionsProps) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const soldOut = stock === 0
  console.log('[ProductActions] 렌더링', { productId, stock, price, soldOut })

  function decrease() {
    console.log('[ProductActions:decrease] 수량 감소', { current: quantity, willBe: Math.max(1, quantity - 1) })
    setQuantity((q) => Math.max(1, q - 1))
  }

  function increase() {
    console.log('[ProductActions:increase] 수량 증가', { current: quantity, willBe: Math.min(stock, quantity + 1), stock })
    setQuantity((q) => Math.min(stock, q + 1))
  }

  async function handleAddToCart() {
    console.log('[ProductActions:handleAddToCart] 장바구니 담기 시작', { productId, quantity })
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[ProductActions:handleAddToCart] 인증 확인', { authenticated: !!user, userId: user?.id })

      if (!user) {
        console.log('[ProductActions:handleAddToCart] 비로그인 — 로그인 페이지로 이동')
        toast.error('로그인이 필요합니다.')
        router.push('/login')
        return
      }

      // 이미 담긴 항목이 있으면 수량 합산, 없으면 새로 삽입
      console.log('[ProductActions:handleAddToCart] 기존 cart_item 조회', { userId: user.id, productId })
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single()

      console.log('[ProductActions:handleAddToCart] 기존 항목 조회 결과', { found: !!existing, existingQty: existing?.quantity })

      if (existing) {
        const newQty = Math.min(stock, existing.quantity + quantity)
        console.log('[ProductActions:handleAddToCart] 기존 항목 수량 업데이트', { existingId: existing.id, from: existing.quantity, to: newQty })
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQty })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        console.log('[ProductActions:handleAddToCart] 신규 cart_item 삽입', { userId: user.id, productId, quantity })
        const { error } = await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: productId, quantity })
        if (error) throw error
      }

      console.log('[ProductActions:handleAddToCart] 장바구니 담기 성공')
      toast.success('장바구니에 담았습니다.')
      router.refresh()
    } catch (err) {
      console.error('[ProductActions:handleAddToCart] 오류 발생', err)
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBuyNow() {
    console.log('[ProductActions:handleBuyNow] 바로 구매 시작', { productId, quantity })
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[ProductActions:handleBuyNow] 인증 확인', { authenticated: !!user })

      if (!user) {
        console.log('[ProductActions:handleBuyNow] 비로그인 — 로그인 페이지로 이동')
        toast.error('로그인이 필요합니다.')
        router.push(`/login?next=/products/${productId}`)
        return
      }

      const checkoutUrl = `/checkout?productId=${productId}&quantity=${quantity}`
      console.log('[ProductActions:handleBuyNow] 결제 페이지로 이동', { checkoutUrl })
      router.push(checkoutUrl)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 재고 표시 */}
      {soldOut ? (
        <p className="text-sm font-semibold text-red-500">품절된 상품입니다.</p>
      ) : (
        <p className="text-sm text-zinc-500">
          재고:{' '}
          <span className={`font-medium ${stock <= 5 ? 'text-orange-500' : 'text-zinc-700'}`}>
            {stock <= 5 ? `${stock}개 (품절 임박)` : `${stock}개`}
          </span>
        </p>
      )}

      {/* 수량 선택 */}
      {!soldOut && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-700">수량</span>
          <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden">
            <button
              onClick={decrease}
              disabled={quantity <= 1}
              className="w-9 h-9 flex items-center justify-center text-zinc-600
                hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center text-sm font-medium text-zinc-900 select-none">
              {quantity}
            </span>
            <button
              onClick={increase}
              disabled={quantity >= stock}
              className="w-9 h-9 flex items-center justify-center text-zinc-600
                hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 총 금액 */}
      {!soldOut && (
        <div className="flex items-center justify-between py-3 border-t border-zinc-200">
          <span className="text-sm text-zinc-500">총 금액</span>
          <span className="text-xl font-bold text-zinc-900">
            {(price * quantity).toLocaleString('ko-KR')}원
          </span>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleAddToCart}
          disabled={soldOut || loading}
          className="flex-1 flex items-center justify-center gap-2 h-11
            border border-zinc-900 text-zinc-900 text-sm font-medium rounded-lg
            hover:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-300
            disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {soldOut ? '품절' : '장바구니 담기'}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={soldOut || loading}
          className="flex-1 flex items-center justify-center gap-2 h-11
            bg-zinc-900 text-white text-sm font-medium rounded-lg
            hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400
            disabled:cursor-not-allowed transition-colors"
        >
          <Zap className="w-4 h-4" />
          {soldOut ? '품절' : '바로 구매'}
        </button>
      </div>
    </div>
  )
}
