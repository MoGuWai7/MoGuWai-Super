/**
 * lib/constants.ts
 *
 * 애플리케이션 전역에서 공유되는 상수 모음.
 *
 * [왜 이 파일이 필요한가]
 * 주문 상태(OrderStatus)의 한글 레이블과 Tailwind 배지 스타일은
 * 어드민 대시보드·주문 관리·마이페이지 등 여러 페이지에서 동일하게 사용된다.
 * 파일마다 복붙하면 수정 시 모든 파일을 고쳐야 하므로 이곳에서 import해 사용한다.
 */

import type { OrderStatus } from '@/types'

// ─── 주문 상태 한글 레이블 ────────────────────────────────────────────────────
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:           '주문완료',
  payment_confirmed: '결제확인',
  preparing:         '배송준비',
  shipping:          '배송중',
  delivered:         '배송완료',
  cancelled:         '취소',
}

// ─── 주문 상태 Tailwind 배지 색상 클래스 ──────────────────────────────────────
// ring-1 과 함께 사용하는 인라인 배지 스타일 (예: ring-1 ${badge})
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  pending:           'bg-blue-50 text-blue-700 ring-blue-200',
  payment_confirmed: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  preparing:         'bg-orange-50 text-orange-700 ring-orange-200',
  shipping:          'bg-purple-50 text-purple-700 ring-purple-200',
  delivered:         'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled:         'bg-red-50 text-red-700 ring-red-200',
}

// ─── 주문 상태 select 옵션 배열 ───────────────────────────────────────────────
// OrderStatusSelect 컴포넌트의 <option> 목록으로 사용
export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending',           label: ORDER_STATUS_LABEL.pending },
  { value: 'payment_confirmed', label: ORDER_STATUS_LABEL.payment_confirmed },
  { value: 'preparing',         label: ORDER_STATUS_LABEL.preparing },
  { value: 'shipping',          label: ORDER_STATUS_LABEL.shipping },
  { value: 'delivered',         label: ORDER_STATUS_LABEL.delivered },
  { value: 'cancelled',         label: ORDER_STATUS_LABEL.cancelled },
]
