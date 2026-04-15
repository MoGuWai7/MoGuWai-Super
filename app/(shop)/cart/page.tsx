/**
 * app/(shop)/cart/page.tsx  (Server Component)
 *
 * 장바구니 페이지 (/cart).
 *
 * [역할]
 * 서버에서 현재 사용자의 장바구니 항목(cart_items + products join)을 조회한 뒤
 * CartClient(클라이언트 컴포넌트)에 initialItems 로 전달한다.
 *
 * [미로그인 처리]
 * 미들웨어에서 1차 차단하지만, 서버 컴포넌트에서도 redirect() 로 이중 확인한다.
 */

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CartClient from '@/components/cart/cart-client'

export const metadata: Metadata = {
  title: '장바구니',
}

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/cart')
  }

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      created_at,
      products (
        id,
        name,
        price,
        stock,
        thumbnail_url,
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // supabase-js 의 join 결과는 products 를 배열로 추론하지만 실제 구조는 단일 객체.
  // 런타임 형태를 보장하므로 unknown 경유 단언으로 UI 타입과 맞춘다.
  const items = (cartItems ?? []) as unknown as Parameters<typeof CartClient>[0]['initialItems']
  return <CartClient initialItems={items} />
}
