/**
 * app/api/cart/[id]/route.ts
 *
 * 장바구니 단건 API.
 * - PATCH /api/cart/[id]: 수량 변경 (quantity 검증 포함)
 * - DELETE /api/cart/[id]: 단건 삭제
 *
 * [보안]
 * .eq('user_id', user.id) 조건으로 본인 항목만 수정/삭제 가능하도록 강제.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `PATCH /api/cart/${id}` })
  log.debug('장바구니 수량 변경 요청 수신', { cartItemId: id })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  log.debug('인증 확인', { authenticated: !!user, userId: user?.id })

  if (!user) {
    log.warn('인증되지 않은 요청 — 401 반환')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { quantity } = await req.json()
  log.debug('요청 바디 파싱', { quantity })

  if (typeof quantity !== 'number' || quantity < 1) {
    log.warn('유효하지 않은 수량 값', { quantity })
    return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
  }

  log.debug('cart_items 수량 업데이트 실행', { cartItemId: id, quantity, userId: user.id })
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    log.error('수량 변경 실패', { err: error.message, cartItemId: id, userId: user.id })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log.info('수량 변경 성공', { cartItemId: id, newQuantity: quantity, userId: user.id })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = logger.child({ route: `DELETE /api/cart/${id}` })
  log.debug('장바구니 단건 삭제 요청 수신', { cartItemId: id })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  log.debug('인증 확인', { authenticated: !!user, userId: user?.id })

  if (!user) {
    log.warn('인증되지 않은 요청 — 401 반환')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  log.debug('cart_items 단건 삭제 실행', { cartItemId: id, userId: user.id })
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    log.error('단건 삭제 실패', { err: error.message, cartItemId: id, userId: user.id })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  log.info('단건 삭제 성공', { cartItemId: id, userId: user.id })
  return NextResponse.json({ success: true })
}
