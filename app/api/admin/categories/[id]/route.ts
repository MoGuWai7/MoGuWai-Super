/**
 * app/api/admin/categories/[id]/route.ts
 *
 * 관리자 카테고리 수정·삭제 API.
 *   PATCH  — 이름/슬러그 수정
 *   DELETE — 소속 상품이 없을 때만 삭제 (참조 무결성 보호)
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/require-admin'
import { recordAuditLog } from '@/lib/admin/audit'
import { categoryBodySchema } from '@/lib/validations/admin'
import { PRODUCTS_CACHE_TAG } from '@/lib/cache/products'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `PATCH /api/admin/categories/${id}` })
  log.debug('관리자 카테고리 수정 요청 수신', { categoryId: id })

  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response
    const { user, supabase } = auth
    log.debug('관리자 인증 통과', { adminId: user.id })

    const raw = await request.json().catch(() => null)
    const parsed = categoryBodySchema.safeParse(raw)
    if (!parsed.success) {
      log.warn('입력 유효성 검사 실패', { issues: parsed.error.issues })
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    log.debug('수정 데이터 파싱 완료', { name: parsed.data.name, slug: parsed.data.slug })

    log.debug('수정 전 스냅샷 조회', { categoryId: id })
    const { data: before } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()
    log.debug('수정 전 상태', { before: before ? { name: before.name, slug: before.slug } : null })

    const { data, error } = await supabase
      .from('categories')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        log.warn('슬러그 중복 충돌 — 409 반환', { slug: parsed.data.slug })
        return NextResponse.json({ error: '이미 사용 중인 슬러그입니다.' }, { status: 409 })
      }
      log.error('카테고리 수정 실패', { err: error.message, categoryId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await recordAuditLog({
      actorId: user.id,
      action: 'category.update',
      targetType: 'category',
      targetId: id,
      diff: { before: before ?? null, after: data },
    })

    revalidateTag(PRODUCTS_CACHE_TAG, 'max')
    log.info('카테고리 수정 완료', { categoryId: id, adminId: user.id })

    return NextResponse.json({ category: data })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `DELETE /api/admin/categories/${id}` })
  log.debug('관리자 카테고리 삭제 요청 수신', { categoryId: id })

  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response
    const { user, supabase } = auth
    log.debug('관리자 인증 통과', { adminId: user.id })

    // 소속 상품(deleted 제외)이 있으면 삭제 거부
    log.debug('소속 상품 수 확인 (참조 무결성 검사)', { categoryId: id })
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .neq('status', 'deleted')

    log.debug('소속 상품 수 확인 결과', { categoryId: id, productCount: count })

    if (count && count > 0) {
      log.warn('소속 상품 있음 — 삭제 거부', { categoryId: id, productCount: count })
      return NextResponse.json(
        { error: `이 카테고리에 상품이 ${count}개 있어 삭제할 수 없습니다.` },
        { status: 409 }
      )
    }

    log.debug('삭제 전 카테고리 스냅샷 조회', { categoryId: id })
    const { data: before } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      log.error('카테고리 삭제 실패', { err: error.message, categoryId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await recordAuditLog({
      actorId: user.id,
      action: 'category.delete',
      targetType: 'category',
      targetId: id,
      diff: { before: before ?? null },
    })

    revalidateTag(PRODUCTS_CACHE_TAG, 'max')
    log.info('카테고리 삭제 완료', { categoryId: id, adminId: user.id })

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
