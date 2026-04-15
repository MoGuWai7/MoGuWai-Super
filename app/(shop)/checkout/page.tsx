/**
 * app/(shop)/checkout/page.tsx  (Server Component)
 *
 * 주문하기 페이지 (/checkout).
 *
 * [두 가지 진입 모드]
 * 1. 바로 구매: ?productId=&quantity= 쿼리 파라미터가 있을 때
 *    → 해당 상품 단건 조회 후 가상 cartItem 구성
 * 2. 장바구니 구매: 쿼리 파라미터 없을 때
 *    → cart_items + products join 조회
 *
 * [역할]
 * 데이터 조회 후 CheckoutForm(클라이언트 컴포넌트)에 전달.
 * 실제 주문 생성(POST /api/orders)은 CheckoutForm 에서 처리.
 */

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CheckoutForm from './checkout-form'

export const metadata: Metadata = { title: '주문하기' }

interface PageProps {
  searchParams: Promise<{
    productId?: string
    quantity?: string
  }>
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { productId, quantity: quantityParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/checkout')

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  // ── 바로 구매 모드 ─────────────────────────────────────
  if (productId) {
    const qty = Math.max(1, parseInt(quantityParam ?? '1', 10))

    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, stock, thumbnail_url')
      .eq('id', productId)
      .eq('status', 'active')
      .single()

    if (!product) redirect('/products')

    const safeQty = Math.min(qty, product.stock)
    if (product.stock === 0) redirect(`/products/${productId}`)

    const buyNowItem = {
      id: `buynow_${productId}`,
      quantity: safeQty,
      products: product,
    }

    return (
      <CheckoutForm
        cartItems={[buyNowItem]}
        defaultName={profile?.name ?? ''}
        buyNow={{ productId, quantity: safeQty }}
      />
    )
  }

  // ── 장바구니 구매 모드 ────────────────────────────────
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      products (
        id,
        name,
        price,
        stock,
        thumbnail_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const validItems = (cartItems ?? [])
    .map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      products: Array.isArray(item.products) ? item.products[0] : item.products,
    }))
    .filter((item) => !!item.products)

  if (validItems.length === 0) redirect('/cart')

  return (
    <CheckoutForm
      cartItems={validItems}
      defaultName={profile?.name ?? ''}
    />
  )
}
