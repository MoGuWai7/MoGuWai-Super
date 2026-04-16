/**
 * app/api/admin/products/route.ts
 *
 * 관리자 상품 등록 API (POST /api/admin/products).
 *
 * 생성 성공 시:
 *  - admin_audit_logs 에 'product.create' 기록
 *  - 상품 목록/상세 캐시 태그 `products` 를 무효화
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/require-admin'
import { recordAuditLog } from '@/lib/admin/audit'
import { productCreateSchema } from '@/lib/validations/admin'
import { PRODUCTS_CACHE_TAG } from '@/lib/cache/products'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const log = logger.child({ route: 'POST /api/admin/products' })
  log.debug('관리자 상품 생성 요청 수신')

  try {
    const auth = await requireAdmin()
    if ('response' in auth) return auth.response
    const { user, supabase } = auth
    log.debug('관리자 인증 통과', { adminId: user.id })

    const raw = await request.json().catch(() => null)
    const parsed = productCreateSchema.safeParse(raw)
    if (!parsed.success) {
      log.warn('입력 유효성 검사 실패', { issues: parsed.error.issues })
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    const input = parsed.data
    log.debug('입력 파싱 완료', { name: input.name, price: input.price, stock: input.stock, status: input.status })

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price,
        stock: input.stock,
        category_id: input.category_id ?? null,
        status: input.status ?? 'active',
        thumbnail_url: input.thumbnail_url || null,
        images: input.images,
      })
      .select()
      .single()

    if (error) {
      log.error('상품 생성 실패', { err: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    log.debug('상품 DB 삽입 성공', { productId: data.id, name: data.name })
    await recordAuditLog({
      actorId: user.id,
      action: 'product.create',
      targetType: 'product',
      targetId: data.id,
      diff: { after: data },
    })

    revalidateTag(PRODUCTS_CACHE_TAG, 'max')
    log.debug('products 캐시 태그 무효화 완료')

    log.info('상품 생성 완료', { productId: data.id, adminId: user.id })
    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
