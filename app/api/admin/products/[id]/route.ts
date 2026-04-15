/**
 * app/api/admin/products/[id]/route.ts
 *
 * 관리자 상품 수정·삭제 API.
 *   PATCH  /api/admin/products/[id]  — 부분 업데이트 (allowedFields)
 *   DELETE /api/admin/products/[id]  — 기본은 soft delete (inactive),
 *                                       ?hard=true 는 status='deleted' 인 상품만 완전 삭제
 *
 * 변경 성공 시 audit log + 캐시 태그 무효화.
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/require-admin'
import { recordAuditLog } from '@/lib/admin/audit'
import { productUpdateSchema } from '@/lib/validations/admin'
import { PRODUCTS_CACHE_TAG } from '@/lib/cache/products'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `PATCH /api/admin/products/${id}` })
  log.debug('관리자 상품 수정 요청 수신', { productId: id })

  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response
    const { user, supabase } = auth
    log.debug('관리자 인증 통과', { adminId: user.id })

    const raw = await request.json().catch(() => null)
    const parsed = productUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      log.warn('입력 유효성 검사 실패', { issues: parsed.error.issues })
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    log.debug('수정 필드 파싱 완료', { fields: Object.keys(parsed.data), values: parsed.data })

    log.debug('수정 전 상품 스냅샷 조회', { productId: id })
    const { data: before } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (!before) {
      log.warn('수정 대상 상품 없음 — 404 반환', { productId: id })
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }
    log.debug('수정 전 상태', { before: { name: before.name, status: before.status, price: before.price } })

    const { data, error } = await supabase
      .from('products')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      log.error('상품 수정 실패', { err: error.message, productId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    log.debug('상품 수정 DB 반영 완료', { productId: id })

    await recordAuditLog({
      actorId: user.id,
      action: 'product.update',
      targetType: 'product',
      targetId: id,
      diff: { before, after: data },
    })

    revalidateTag(PRODUCTS_CACHE_TAG, 'max')
    log.debug('products 캐시 태그 무효화 완료')

    log.info('상품 수정 완료', { productId: id, adminId: user.id, changedFields: Object.keys(parsed.data) })
    return NextResponse.json({ product: data })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const isHardDelete = new URL(request.url).searchParams.get('hard') === 'true'
  const log = logger.child({ route: `DELETE /api/admin/products/${id}`, mode: isHardDelete ? 'hard' : 'soft' })
  log.debug('관리자 상품 삭제 요청 수신', { productId: id, isHardDelete })

  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response
    const { user, supabase } = auth
    log.debug('관리자 인증 통과', { adminId: user.id })

    if (isHardDelete) {
      // 완전 삭제: status='deleted' 인 상품만 허용 (주문 내역 참조 무결성 보호)
      log.debug('hard delete 경로 — 삭제됨 상태 확인', { productId: id })
      const { data: before } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (!before) {
        log.warn('hard delete 대상 상품 없음', { productId: id })
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
      }
      if (before.status !== 'deleted') {
        log.warn('hard delete 불가 — status가 deleted 아님', { productId: id, status: before.status })
        return NextResponse.json(
          { error: '완전 삭제는 삭제됨 상태의 상품만 가능합니다.' },
          { status: 400 }
        )
      }

      log.debug('상품 DB 완전 삭제 실행', { productId: id })
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) {
        log.error('상품 완전 삭제 실패', { err: error.message, productId: id })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await recordAuditLog({
        actorId: user.id,
        action: 'product.hard_delete',
        targetType: 'product',
        targetId: id,
        diff: { before },
      })

      revalidateTag(PRODUCTS_CACHE_TAG, 'max')
      log.info('상품 완전 삭제 완료', { productId: id, adminId: user.id })
      return NextResponse.json({ success: true })
    }

    // 소프트: 판매 중지 (inactive)
    log.debug('soft delete 경로 — status를 inactive로 변경', { productId: id })
    const { data: before } = await supabase
      .from('products')
      .select('status')
      .eq('id', id)
      .single()

    log.debug('소프트 삭제 전 상태', { productId: id, previousStatus: before?.status })
    const { error } = await supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('id', id)

    if (error) {
      log.error('상품 소프트 삭제 실패', { err: error.message, productId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await recordAuditLog({
      actorId: user.id,
      action: 'product.soft_delete',
      targetType: 'product',
      targetId: id,
      diff: { before: before ?? null, after: { status: 'inactive' } },
    })

    revalidateTag(PRODUCTS_CACHE_TAG, 'max')
    log.info('상품 소프트 삭제 완료', { productId: id, adminId: user.id, previousStatus: before?.status })
    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
