import { describe, it, expect } from 'vitest'
import { calculateCartTotals, formatKrw } from './calculate'

describe('calculateCartTotals', () => {
  it('빈 배열이면 모든 값이 0', () => {
    expect(calculateCartTotals([])).toEqual({
      itemCount: 0,
      subtotal: 0,
      unavailableCount: 0,
    })
  })

  it('여러 항목의 합계를 정확히 계산한다', () => {
    const r = calculateCartTotals([
      { price: 1000, quantity: 2 },
      { price: 3500, quantity: 3 },
    ])
    expect(r.itemCount).toBe(5)
    expect(r.subtotal).toBe(1000 * 2 + 3500 * 3)
    expect(r.unavailableCount).toBe(0)
  })

  it('available=false 항목은 합계에서 제외하고 별도 카운트한다', () => {
    const r = calculateCartTotals([
      { price: 1000, quantity: 2, available: true },
      { price: 5000, quantity: 1, available: false },
    ])
    expect(r.subtotal).toBe(2000)
    expect(r.unavailableCount).toBe(1)
    expect(r.itemCount).toBe(2)
  })

  it('음수/NaN 수량·가격은 0 으로 방어된다', () => {
    const r = calculateCartTotals([
      { price: -100, quantity: 2 },
      { price: 1000, quantity: -5 },
      { price: NaN, quantity: 3 },
      { price: 1000, quantity: NaN },
    ])
    expect(r.subtotal).toBe(0)
    expect(r.itemCount).toBe(0)
  })

  it('소수점 수량은 내림 처리', () => {
    const r = calculateCartTotals([{ price: 1000, quantity: 2.9 }])
    expect(r.itemCount).toBe(2)
    expect(r.subtotal).toBe(2000)
  })
})

describe('formatKrw', () => {
  it('세 자리 구분 + 원 단위', () => {
    expect(formatKrw(1234567)).toBe('1,234,567원')
  })

  it('0 은 "0원"', () => {
    expect(formatKrw(0)).toBe('0원')
  })

  it('소수점은 반올림', () => {
    expect(formatKrw(1999.6)).toBe('2,000원')
  })

  it('NaN/Infinity 는 0 으로 방어', () => {
    expect(formatKrw(NaN)).toBe('0원')
    expect(formatKrw(Infinity)).toBe('0원')
  })
})
