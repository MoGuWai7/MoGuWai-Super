/**
 * components/layout/Header.tsx  (Server Component)
 *
 * 쇼핑몰 공통 헤더 — 서버에서 데이터를 조회한 뒤 클라이언트 컴포넌트로 전달한다.
 *
 * [역할]
 * - 현재 로그인 사용자 정보 조회
 * - 장바구니 상품 수(badge) 조회
 * - 관리자 여부(isAdmin) 확인
 * → 위 세 가지를 HeaderClient 로 props 전달
 *
 * [왜 Server/Client 분리?]
 * 헤더 데이터(로그인·장바구니)는 서버에서 fetch 하고,
 * 드롭다운·검색 토글 등 인터랙션은 클라이언트에서 처리해야 하기 때문.
 */

import { createClient } from '@/lib/supabase/server'
import HeaderClient from './header-client'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let cartCount = 0
  let isAdmin = false

  if (user) {
    const [{ count }, { data: profile }] = await Promise.all([
      supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single(),
    ])
    cartCount = count ?? 0
    isAdmin = profile?.role === 'admin'
  }

  return (
    <HeaderClient
      user={user ? { email: user.email ?? '' } : null}
      cartCount={cartCount}
      isAdmin={isAdmin}
    />
  )
}
