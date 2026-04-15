import { describe, it, expect } from 'vitest'
import { orderCreateBodySchema, shippingAddressSchema } from './orders'

const VALID_ADDR = {
  name: '홍길동',
  phone: '010-1234-5678',
  zip: '12345',
  address1: '서울시 강남구',
  address2: '101호',
}

describe('shippingAddressSchema', () => {
  it('정상 배송지 통과', () => {
    const r = shippingAddressSchema.safeParse(VALID_ADDR)
    expect(r.success).toBe(true)
  })

  it('공백 이름은 실패', () => {
    const r = shippingAddressSchema.safeParse({ ...VALID_ADDR, name: '   ' })
    expect(r.success).toBe(false)
  })

  it('우편번호에 문자가 섞이면 실패', () => {
    const r = shippingAddressSchema.safeParse({ ...VALID_ADDR, zip: '12A45' })
    expect(r.success).toBe(false)
  })

  it('address2 는 비어있어도 OK (기본값)', () => {
    const r = shippingAddressSchema.safeParse({ ...VALID_ADDR, address2: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.address2).toBe('')
  })
})

describe('orderCreateBodySchema', () => {
  it('buyNow 없이도 유효 (장바구니 주문)', () => {
    const r = orderCreateBodySchema.safeParse({ shipping_address: VALID_ADDR })
    expect(r.success).toBe(true)
  })

  it('buyNow.productId 는 UUID 여야 한다', () => {
    const r = orderCreateBodySchema.safeParse({
      shipping_address: VALID_ADDR,
      buyNow: { productId: 'not-a-uuid', quantity: 1 },
    })
    expect(r.success).toBe(false)
  })

  it('buyNow.quantity 문자열도 숫자로 강제 변환', () => {
    const r = orderCreateBodySchema.safeParse({
      shipping_address: VALID_ADDR,
      buyNow: { productId: '11111111-1111-4111-8111-111111111111', quantity: '3' },
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.buyNow?.quantity).toBe(3)
  })

  it('quantity 0 은 실패', () => {
    const r = orderCreateBodySchema.safeParse({
      shipping_address: VALID_ADDR,
      buyNow: { productId: '11111111-1111-4111-8111-111111111111', quantity: 0 },
    })
    expect(r.success).toBe(false)
  })
})
