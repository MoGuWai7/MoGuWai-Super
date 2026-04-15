/**
 * app/api/orders/[id]/route.ts
 *
 * 주문 취소 API.
 * PATCH /api/orders/[id] — 본인 주문을 취소(status → 'cancelled')한다.
 *
 * [취소 조건]
 * - pending 또는 payment_confirmed 상태인 주문만 취소 가능
 * - 본인 주문인지 user_id로 검증
 *
 * [왜 AdminClient를 사용하는가]
 * RLS 정책상 orders 테이블의 status 변경은 관리자만 가능하도록 설정되어 있다.
 * 사용자가 직접 취소하는 경우에도 서버(API Route)에서 service_role 키로 처리한다.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// 취소 가능한 상태
const CANCELLABLE = ['pending', 'payment_confirmed']

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `PATCH /api/orders/${id}` })
  log.debug('주문 취소 요청 수신', { orderId: id })

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    log.debug('인증 확인', { authenticated: !!user, userId: user?.id })

    if (!user) {
      log.warn('인증되지 않은 요청 — 401 반환')
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 주문 소유권 + 상태 검증 (사용자 세션으로 조회)
    log.debug('주문 소유권 및 상태 조회', { orderId: id, userId: user.id })
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    log.debug('주문 조회 결과', { found: !!order, status: order?.status })

    if (!order) {
      log.warn('주문 없음 또는 소유권 불일치 — 404 반환', { orderId: id, userId: user.id })
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!CANCELLABLE.includes(order.status)) {
      log.warn('취소 불가 상태 — 400 반환', { orderId: id, status: order.status, cancellable: CANCELLABLE })
      return NextResponse.json(
        { error: '배송 준비 이후 단계는 취소할 수 없습니다.' },
        { status: 400 }
      )
    }

    // RLS 우회하여 status 업데이트 (orders 테이블 status 변경은 service_role만 가능)
    log.debug('service_role로 주문 상태를 cancelled로 변경', { orderId: id, previousStatus: order.status })
    const admin = createAdminClient()
    const { error } = await admin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      log.error('주문 취소 업데이트 실패', { err: error.message, orderId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    log.info('주문 취소 성공', { orderId: id, userId: user.id, previousStatus: order.status })
    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
