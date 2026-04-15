/**
 * lib/validations/orders.ts
 *
 * 주문 관련 요청 스키마 (zod).
 *
 * [왜 zod 인가]
 * API Route 에서 수기로 `typeof x === 'string' && x.trim()` 같은 검증을 반복하면
 * (1) 검증 누락, (2) 타입 추론 불일치가 자주 발생한다.
 * zod 는 런타임 검증과 TypeScript 타입 추론을 한 스키마에서 동시에 얻을 수 있어
 * 중급 수준 API 코드의 표준 패턴이 되었다.
 *
 * [UI 단에서도 재사용]
 * 같은 스키마를 클라이언트 폼 검증에 써서 서버/클라 검증 규칙 불일치를 제거할 수 있다.
 */

import { z } from 'zod'

/** 배송지 스키마 — orders.shipping_address 에 그대로 저장 */
export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1, '받는 분 이름을 입력해주세요.').max(50),
  phone: z
    .string()
    .trim()
    .min(1, '연락처를 입력해주세요.')
    .regex(/^[0-9\-+\s()]{7,20}$/, '올바른 연락처 형식이 아닙니다.'),
  zip: z
    .string()
    .trim()
    .min(1, '우편번호를 입력해주세요.')
    .regex(/^[0-9]{4,10}$/, '우편번호는 숫자만 입력해주세요.'),
  address1: z.string().trim().min(1, '주소를 입력해주세요.').max(200),
  address2: z.string().trim().max(200).default(''),
})

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>

/**
 * POST /api/orders 요청 본문.
 * - buyNow: 상품 상세에서 바로 구매 (productId + quantity)
 * - 없으면 장바구니 전체 주문
 */
export const orderCreateBodySchema = z.object({
  shipping_address: shippingAddressSchema,
  buyNow: z
    .object({
      productId: z.string().uuid('상품 식별자가 올바르지 않습니다.'),
      quantity: z.coerce.number().int().min(1).max(1000),
    })
    .optional(),
})

export type OrderCreateBody = z.infer<typeof orderCreateBodySchema>
