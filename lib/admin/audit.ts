/**
 * lib/admin/audit.ts
 *
 * 관리자 감사 로그(admin_audit_logs) 기록 헬퍼.
 *
 * [설계]
 * 모든 관리자 쓰기 작업은 이 함수를 호출해 작업 내역을 남긴다.
 *  - action      : 'order.status_change' | 'product.update' | 'product.soft_delete' ...
 *  - target_type : 'order' | 'product' | 'category'
 *  - diff        : { before?, after? } 스냅샷
 *
 * 실패해도 비즈니스 로직은 계속 진행해야 하므로, 이 함수는 예외를 throw 하지 않고
 * logger 로 경고만 남긴다. (감사 로그가 빠지는 것보다 서비스 장애가 더 나쁨)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type AuditAction =
  | 'order.status_change'
  | 'product.create'
  | 'product.update'
  | 'product.soft_delete'
  | 'product.hard_delete'
  | 'category.create'
  | 'category.update'
  | 'category.delete'

export type AuditTargetType = 'order' | 'product' | 'category'

export async function recordAuditLog(params: {
  actorId: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string | null
  diff?: Record<string, unknown>
}): Promise<void> {
  logger.debug('감사 로그 기록 시작', {
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    actorId: params.actorId,
  })

  try {
    const admin = createAdminClient()
    const { error } = await admin.rpc('log_admin_action', {
      p_actor_id: params.actorId,
      p_action: params.action,
      p_target_type: params.targetType,
      p_target_id: params.targetId,
      p_diff: params.diff ?? {},
    })
    if (error) {
      logger.warn('감사 로그 기록 실패', { action: params.action, err: error.message })
    } else {
      logger.debug('감사 로그 기록 성공', { action: params.action, targetId: params.targetId })
    }
  } catch (err) {
    logger.warn('감사 로그 기록 예외', {
      action: params.action,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
