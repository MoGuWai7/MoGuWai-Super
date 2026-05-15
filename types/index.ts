/**
 * types/index.ts
 *
 * 프로젝트 전체 타입 중앙 관리 파일.
 *
 * [구성]
 * 1. 기본 엔티티 타입   — DB 테이블과 1:1 대응 (User, Product, Order 등)
 * 2. Supabase 조인 타입 — select() join 결과는 자동 추론이 안 되므로 수동으로 정의
 *
 * 새 타입이 필요하면 이 파일에 추가하고, 로컬 타입 선언은 최대한 피한다.
 */

// ─── 1. 기본 엔티티 타입 ──────────────────────────────────────────────────────

export type User = {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
}

export type Category = {
  id: string
  name: string
  slug: string
}

export type Product = {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category_id: string | null
  thumbnail_url: string | null
  images: string[]
  /** 'active' = 판매중 | 'inactive' = 비활성 | 'deleted' = 소프트 삭제 */
  status: 'active' | 'inactive' | 'deleted'
  created_at: string
  /** categories 테이블과 join 시 포함되는 필드 */
  categories?: Category | null
}

export type CartItem = {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  /** products 테이블과 join 시 포함되는 필드 */
  products?: Product | null
}

/** 주문 진행 상태 — pending → payment_confirmed → preparing → shipping → delivered / cancelled */
export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

/** 배송지 정보 (Order.shipping_address 구조) */
export type ShippingAddress = {
  name: string
  phone: string
  zip: string
  address1: string
  address2: string
}

export type Order = {
  id: string
  user_id: string
  status: OrderStatus
  total_price: number
  shipping_address: ShippingAddress
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  quantity: number
  /** 주문 당시의 가격을 별도 저장 — 이후 상품 가격이 바뀌어도 주문 금액은 고정 */
  price_at_order: number
  products?: Product | null
}

// ─── 2. Supabase 조인 쿼리 결과 타입 ─────────────────────────────────────────
//
// supabase-js 의 select() join 결과는 자동 추론이 제한적이므로
// 쿼리 형태에 맞는 타입을 명시적으로 정의한다.
// 이름 규칙: 기본 타입명 + "With" + join 대상

/** cart_items + products join 결과 (장바구니 조회) */
export type CartItemWithProduct = {
  id: string
  quantity: number
  created_at: string
  products: {
    id: string
    name: string
    price: number
    stock: number
    thumbnail_url: string | null
    status: string
  } | null
}

/** order_items + products join 결과 (주문 상세) */
export type OrderItemWithProduct = {
  id: string
  quantity: number
  price_at_order: number
  products: {
    id: string
    name: string
    thumbnail_url: string | null
  } | null
}

/** 방문자 로그 (access_logs 테이블) */
export type AccessLog = {
  id: number
  ip: string
  user_agent: string
  device: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  path: string
  referer: string
  country: string
  city: string
  created_at: string
}

/**
 * 주문 목록/요약 조회용 join 결과.
 * order_items 안에는 상품명(+썸네일)만 포함 — 목록 카드 렌더링에 필요한 최소 정보.
 */
export type OrderListItem = {
  id: string
  status: OrderStatus
  total_price: number
  created_at: string
  order_items: {
    products: {
      name: string
      thumbnail_url?: string | null
    } | null
  }[]
}
