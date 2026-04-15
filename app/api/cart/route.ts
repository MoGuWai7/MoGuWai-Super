/**
 * app/api/cart/route.ts
 *
 * 장바구니 전체 삭제 API (DELETE /api/cart).
 * 단건 조작(수량 변경/삭제)은 /api/cart/[id]/route.ts 에서 처리한다.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function DELETE() {
  const log = logger.child({ route: 'DELETE /api/cart' })
  log.debug('장바구니 전체 삭제 요청 수신')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  log.debug('인증 확인', { authenticated: !!user, userId: user?.id })

  if (!user) {
    log.warn('인증되지 않은 요청 — 401 반환')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  log.debug('cart_items 전체 삭제 실행', { userId: user.id })
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    log.error('장바구니 전체 삭제 실패', { err: error.message, userId: user.id })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log.info('장바구니 전체 삭제 성공', { userId: user.id })
  return NextResponse.json({ success: true })
}
