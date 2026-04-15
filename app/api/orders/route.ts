/**
 * app/api/orders/route.ts
 *
 * 주문 생성 API (POST /api/orders).
 *
 * [설계 포인트]
 * 이전 버전은 orders / order_items / products 를 API Route 내부에서
 * 여러 쿼리로 나눠 처리하고, 실패 시 수동 delete 로 롤백했다.
 * 그러나 (1) 재고 검증과 차감 사이 race condition, (2) 부분 실패 시 고아 레코드
 * 위험이 남아 있었다.
 *
 * 이번 버전에서는 Postgres RPC `create_order()` 를 호출해
 * 주문 생성 전체를 단일 트랜잭션으로 원자화한다.
 *   - 상품 행 `SELECT ... FOR UPDATE` 로 동시 주문 경합 방지
 *   - BEGIN/COMMIT 범위에서 실패 시 전체 자동 롤백
 *   - `orders.idempotency_key` UNIQUE 로 중복 요청 차단
 *
 * API Route 는 인증 · 입력 검증 · 에러 매핑만 담당하는 얇은 레이어다.
 *
 * [멱등성]
 * 클라이언트는 `Idempotency-Key` 헤더에 UUID 등의 고유 값을 담아 전송한다.
 * 네트워크 재시도·더블클릭으로 같은 요청이 두 번 도착해도
 * RPC 가 기존 주문 id 를 그대로 반환해 중복 생성을 막는다.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { orderCreateBodySchema } from '@/lib/validations/orders'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

type RpcItem = { product_id: string; quantity: number }

export async function POST(request: Request) {
  const log = logger.child({ route: 'POST /api/orders' })

  try {
    const supabase = await createClient()

    // ── 인증 ─────────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // ── Rate limiting (사용자 단위, 주문 생성은 비용이 큰 쓰기 작업) ───────────
    const rl = rateLimit({ key: `orders:create:${user.id}`, limit: 10, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    // ── 입력 파싱 및 스키마 검증 ─────────────────────────────────────────────
    const raw = await request.json().catch(() => null)
    const parsed = orderCreateBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '요청 본문이 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    const { shipping_address, buyNow } = parsed.data

    // ── 멱등성 키 (헤더) ─────────────────────────────────────────────────────
    // 형식 검증: 8~128자 안전한 문자만 허용 (UUID / ULID 등)
    const rawKey = request.headers.get('Idempotency-Key')
    const idempotencyKey =
      rawKey && /^[A-Za-z0-9_-]{8,128}$/.test(rawKey) ? rawKey : null

    log.debug('입력 파싱 완료', { mode: buyNow ? 'buyNow' : 'cart', idempotencyKey: idempotencyKey ?? '없음' })

    // ── RPC 입력 `items` 조립 ─────────────────────────────────────────────────
    // 바로 구매 / 장바구니 구매 두 모드 모두 동일한 형태로 RPC 에 전달한다
    let items: RpcItem[]

    if (buyNow) {
      items = [{ product_id: buyNow.productId, quantity: buyNow.quantity }]
      log.debug('바로 구매 모드 — items 조립', { items })
    } else {
      const { data: cartItems, error: cartErr } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', user.id)

      if (cartErr) {
        log.error('cart_items 조회 실패', { err: cartErr.message })
        return NextResponse.json({ error: '장바구니 조회에 실패했습니다.' }, { status: 500 })
      }
      if (!cartItems || cartItems.length === 0) {
        log.warn('빈 장바구니로 주문 시도', { userId: user.id })
        return NextResponse.json({ error: '장바구니가 비어있습니다.' }, { status: 400 })
      }

      items = cartItems.map((c) => ({ product_id: c.product_id, quantity: c.quantity }))
      log.debug('장바구니 모드 — items 조립', { itemCount: items.length, items })
    }

    // ── RPC 호출 ─────────────────────────────────────────────────────────────
    log.debug('create_order RPC 호출', {
      userId: user.id,
      itemCount: items.length,
      idempotent: Boolean(idempotencyKey),
    })
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order', {
      p_user_id: user.id,
      p_items: items,
      p_shipping_address: shipping_address,
      p_idempotency_key: idempotencyKey,
    })

    if (rpcError) {
      // Postgres 사용자 정의 예외(P0001/P0002/P0003) → 사용자에게 보여줄 메시지 매핑
      const msg = rpcError.message ?? ''
      if (msg.includes('OUT_OF_STOCK')) {
        return NextResponse.json({ error: '일부 상품의 재고가 부족합니다.' }, { status: 400 })
      }
      if (msg.includes('PRODUCT_NOT_AVAILABLE')) {
        return NextResponse.json({ error: '판매 중이 아닌 상품이 포함되어 있습니다.' }, { status: 400 })
      }
      if (msg.includes('INVALID_QUANTITY')) {
        return NextResponse.json({ error: '수량이 올바르지 않습니다.' }, { status: 400 })
      }
      log.error('create_order RPC 실패', { err: msg, userId: user.id })
      return NextResponse.json({ error: '주문 생성에 실패했습니다.' }, { status: 500 })
    }

    log.info('주문 생성 성공', { userId: user.id, orderId, idempotent: Boolean(idempotencyKey) })

    return NextResponse.json({ orderId }, { status: 201 })
  } catch (err) {
    log.error('예기치 못한 서버 오류', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
