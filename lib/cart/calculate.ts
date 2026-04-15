/**
 * lib/cart/calculate.ts
 *
 * 장바구니/주문 금액 계산 **순수 함수**.
 *
 * [분리 이유]
 * 이전에는 `app/api/orders/route.ts` 내부에 총액 계산 로직이 섞여 있어
 *  - 동일 계산이 UI(장바구니 요약)와 서버(주문 생성)에서 중복 구현됨
 *  - 단위 테스트가 DB 모킹 없이는 어려움
 * 이 파일은 I/O 없이 숫자 계산만 수행하므로 vitest 에서 바로 테스트 가능하다.
 */

export type CartLine = {
  price: number
  quantity: number
  /** 판매 중이 아닌 항목은 total 에서 제외 */
  available?: boolean
}

export type CartTotals = {
  itemCount: number
  subtotal: number
  unavailableCount: number
}

/**
 * 장바구니 합계 계산.
 * - price / quantity 가 유한 음수가 아닌 값이면 해당 항목을 통째로 스킵(방어적)
 * - available === false 인 항목은 금액에서 제외하고 unavailableCount 로 분리 카운트
 */
export function calculateCartTotals(lines: readonly CartLine[]): CartTotals {
  console.log('[calculateCartTotals] 호출 — 입력', { lineCount: lines.length, lines })

  let itemCount = 0
  let subtotal = 0
  let unavailableCount = 0

  for (const line of lines) {
    const qtyValid = Number.isFinite(line.quantity) && line.quantity >= 0
    const priceValid = Number.isFinite(line.price) && line.price >= 0
    // 입력이 잘못된 항목은 count/subtotal 모두에서 제외 — 오염된 데이터가 집계에 섞이지 않도록
    if (!qtyValid || !priceValid) {
      console.log('[calculateCartTotals] 유효하지 않은 항목 스킵', { price: line.price, quantity: line.quantity })
      continue
    }

    if (line.available === false) {
      console.log('[calculateCartTotals] 판매 불가 항목 분리', { price: line.price, quantity: line.quantity })
      unavailableCount += 1
      continue
    }

    const qty = Math.floor(line.quantity)
    itemCount += qty
    subtotal += line.price * qty
  }

  const result = { itemCount, subtotal, unavailableCount }
  console.log('[calculateCartTotals] 반환값', result)
  return result
}

/**
 * 한국 원화 포맷터.
 * UI 와 서버 응답에서 공통으로 쓰기 위해 분리.
 */
export function formatKrw(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `${n.toLocaleString('ko-KR')}원`
}
