/**
 * app/(shop)/mypage/page.tsx
 *
 * 사용자 마이페이지 메인 화면.
 *
 * [구성]
 * - 회원 정보 카드: 이름 · 이메일 · 가입일
 * - 최근 주문 5건 목록: 주문번호 · 상태 배지 · 상품명 · 금액
 *   → 클릭 시 /mypage/orders/[id] 로 이동
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { User, ShoppingBag, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from '@/lib/constants'

export const metadata: Metadata = { title: '마이페이지' }

export default async function MypagePage() {
  const supabase = await createClient()

  // 로그인 확인 (미들웨어에서도 처리하지만 서버 컴포넌트에서 이중 확인)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mypage')

  // 프로필 + 최근 주문 5건 병렬 조회
  const [{ data: profile }, { data: recentOrders }] = await Promise.all([
    supabase.from('users').select('name, email, created_at').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select(`
        id, status, total_price, created_at,
        order_items(products(name))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">마이페이지</h1>

      {/* 회원 정보 카드 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-900 truncate">
            {profile?.name || '이름 없음'}
          </p>
          <p className="text-sm text-zinc-500 truncate">{profile?.email ?? user.email}</p>
          {profile?.created_at && (
            <p className="text-xs text-zinc-400 mt-0.5">
              가입일:{' '}
              {new Date(profile.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* 최근 주문 목록 */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">최근 주문</h2>
          <Link
            href="/mypage/orders"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            전체 보기
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <ShoppingBag className="w-10 h-10 text-zinc-200" />
            <p className="text-sm text-zinc-400">아직 주문 내역이 없습니다.</p>
            <Link
              href="/products"
              className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm
                font-medium hover:bg-zinc-700 transition-colors"
            >
              쇼핑 시작하기
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {(recentOrders as any[]).map((order) => {
              // 대표 상품명 + 추가 수량 표시
              const firstName = order.order_items?.[0]?.products?.name ?? '—'
              const extra = (order.order_items?.length ?? 1) - 1
              const badge = ORDER_STATUS_BADGE[order.status as OrderStatus] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'

              return (
                <li key={order.id}>
                  <Link
                    href={`/mypage/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-zinc-400">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full
                          text-xs font-medium ring-1 ${badge}`}>
                          {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {firstName}{extra > 0 && ` 외 ${extra}개`}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-zinc-900 text-sm">
                        {order.total_price.toLocaleString('ko-KR')}원
                      </p>
                      <ChevronRight className="w-4 h-4 text-zinc-300 ml-auto mt-1" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
