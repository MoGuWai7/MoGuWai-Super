/**
 * app/api/admin/orders/[id]/route.ts
 *
 * 관리자 주문 상태 변경 API (PATCH /api/admin/orders/[id]).
 *
 * [보안 계층]
 * 1. requireAdmin() 으로 로그인 + role='admin' 확인
 * 2. zod 로 status enum 검증
 *
 * [감사 로그]
 * 상태 변경 직전/직후 값을 `admin_audit_logs.diff` 에 기록한다.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'
import { recordAuditLog } from '@/lib/admin/audit'
import { orderStatusUpdateSchema } from '@/lib/validations/admin'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `PATCH /api/admin/orders/${id}` })
  log.debug('관리자 주문 상태 변경 요청 수신', { orderId: id })

  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response
    const { user, supabase } = auth
    log.debug('관리자 인증 통과', { adminId: user.id })

    const raw = await request.json().catch(() => null)
    const parsed = orderStatusUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      log.warn('상태값 유효성 검사 실패', { issues: parsed.error.issues, raw })
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '유효하지 않은 상태값입니다.' },
        { status: 400 }
      )
    }
    log.debug('변경할 상태값 파싱 완료', { newStatus: parsed.data.status })

    // 변경 전 상태 스냅샷 (감사 로그 diff 용)
    log.debug('변경 전 주문 상태 조회', { orderId: id })
    const { data: before } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single()

    if (!before) {
      log.warn('주문 없음 — 404 반환', { orderId: id })
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }
    log.debug('상태 전환', { orderId: id, from: before.status, to: parsed.data.status })

    const { data, error } = await supabase
      .from('orders')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      log.error('주문 상태 변경 실패', { err: error.message, orderId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 감사 로그 (실패해도 본 응답은 막지 않는다)
    await recordAuditLog({
      actorId: user.id,
      action: 'order.status_change',
      targetType: 'order',
      targetId: id,
      diff: { before: { status: before.status }, after: { status: parsed.data.status } },
    })

    log.info('주문 상태 변경 완료', { orderId: id, adminId: user.id, from: before.status, to: parsed.data.status })
    return NextResponse.json({ order: data })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
