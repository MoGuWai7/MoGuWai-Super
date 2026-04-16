/**
 * lib/validations/admin.ts
 *
 * 관리자 API 입력 스키마.
 */

import { z } from 'zod'

// ── 상품 ─────────────────────────────────────────────────────────────────────

export const productStatusSchema = z.enum(['active', 'inactive', 'deleted'])

const slugSchema = z
  .string()
  .trim()
  .min(1, '슬러그를 입력해주세요.')
  .max(200)
  .regex(/^[a-z0-9가-힣-]+$/, '슬러그는 소문자·숫자·한글·하이픈만 사용할 수 있습니다.')

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, '상품명을 입력해주세요.').max(200),
  slug: slugSchema,
  description: z.string().trim().max(5000).default(''),
  price: z.coerce.number().int().min(0, '가격은 0원 이상이어야 합니다.'),
  stock: z.coerce.number().int().min(0, '재고는 0 이상이어야 합니다.'),
  category_id: z.string().uuid().nullable().optional(),
  status: productStatusSchema.optional(),
  thumbnail_url: z.string().trim().url().nullable().optional().or(z.literal('')),
  images: z.array(z.string().url()).default([]),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>

/**
 * 상품 수정은 부분 업데이트. 허용 필드만 받는다.
 * UNIQUE/참조 무결성은 DB 에서 검증.
 */
export const productUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().max(5000).optional(),
    price: z.coerce.number().int().min(0).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    category_id: z.string().uuid().nullable().optional(),
    status: productStatusSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '변경할 내용이 없습니다.' })

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>

// ── 카테고리 ─────────────────────────────────────────────────────────────────

export const categoryBodySchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.').max(50),
  slug: z
    .string()
    .trim()
    .min(1, '슬러그를 입력해주세요.')
    .max(50)
    .regex(/^[a-z0-9-]+$/, '슬러그는 소문자·숫자·하이픈만 사용할 수 있습니다.'),
})

export type CategoryBodyInput = z.infer<typeof categoryBodySchema>

// ── 주문 상태 변경 ───────────────────────────────────────────────────────────

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'payment_confirmed',
    'preparing',
    'shipping',
    'delivered',
    'cancelled',
  ]),
})

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>
