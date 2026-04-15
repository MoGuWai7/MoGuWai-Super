/**
 * app/admin/orders/[id]/order-status-select.tsx
 *
 * 어드민 주문 상세 페이지의 주문 상태 변경 드롭다운 컴포넌트.
 *
 * [동작 방식]
 * - select 변경 시 PATCH /api/admin/orders/[id] 를 호출해 상태를 즉시 업데이트
 * - 성공/실패 여부를 toast 로 안내하고, 성공 시 router.refresh() 로 서버 데이터를 갱신
 *
 * [주의]
 * 'use client' 가 필요한 이유: onChange 이벤트 핸들러가 클라이언트에서 실행되기 때문
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { OrderStatus } from '@/types'
import { ORDER_STATUS_OPTIONS } from '@/lib/constants'

interface Props {
  orderId: string
  currentStatus: OrderStatus
}

export default function OrderStatusSelect({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(newStatus: OrderStatus) {
    console.log('[OrderStatusSelect:handleChange] 상태 변경 시도', { orderId, from: status, to: newStatus })

    // 현재 상태와 동일하면 API 호출 불필요
    if (newStatus === status) {
      console.log('[OrderStatusSelect:handleChange] 동일 상태 — 무시')
      return
    }

    setLoading(true)
    try {
      console.log('[OrderStatusSelect:handleChange] PATCH /api/admin/orders/:id 요청', { orderId, newStatus })
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      console.log('[OrderStatusSelect:handleChange] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '상태 변경 실패')
      }
      console.log('[OrderStatusSelect:handleChange] 상태 변경 성공', { orderId, from: status, to: newStatus })
      setStatus(newStatus)
      toast.success('주문 상태가 변경되었습니다.')
      // 서버 컴포넌트 데이터 재조회 (상태 배지 등 갱신)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다.'
      console.error('[OrderStatusSelect:handleChange] 상태 변경 실패', { orderId, message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-zinc-700">주문 상태</label>
      <select
        value={status}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        className="h-9 pl-3 pr-8 rounded-lg border border-zinc-300 text-sm font-medium
          text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900
          focus:border-transparent disabled:opacity-50 transition-colors cursor-pointer"
      >
        {ORDER_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {loading && (
        <span className="text-xs text-zinc-400">저장 중...</span>
      )}
    </div>
  )
}
