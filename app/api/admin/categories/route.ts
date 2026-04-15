/**
 * app/api/admin/categories/route.ts
 *
 * 관리자 카테고리 생성 API (POST /api/admin/categories).
 * slug 중복 시 Postgres 23505 (unique_violation) 을 감지해 409로 응답한다.
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/require-admin'
import { recordAuditLog } from '@/lib/admin/audit'
import { categoryBodySchema } from '@/lib/validations/admin'
import { PRODUCTS_CACHE_TAG } from '@/lib/cache/products'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const log = logger.child({ route: 'POST /api/admin/categories' })
  log.debug('관리자 카테고리 생성 요청 수신')

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
    log.debug('카테고리 데이터 파싱 완료', { name: parsed.data.name, slug: parsed.data.slug })

    const { data, error } = await supabase
      .from('categories')
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        log.warn('슬러그 중복 충돌 — 409 반환', { slug: parsed.data.slug })
        return NextResponse.json({ error: '이미 사용 중인 슬러그입니다.' }, { status: 409 })
      }
      log.error('카테고리 생성 실패', { err: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    log.debug('카테고리 DB 삽입 성공', { categoryId: data.id, name: data.name })

    await recordAuditLog({
      actorId: user.id,
      action: 'category.create',
      targetType: 'category',
      targetId: data.id,
      diff: { after: data },
    })

    revalidateTag(PRODUCTS_CACHE_TAG, 'max')
    log.debug('products 캐시 태그 무효화 완료')

    log.info('카테고리 생성 완료', { categoryId: data.id, adminId: user.id })
    return NextResponse.json({ category: data }, { status: 201 })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
