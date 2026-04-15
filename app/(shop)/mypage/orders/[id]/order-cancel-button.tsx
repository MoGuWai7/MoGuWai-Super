/**
 * app/(shop)/mypage/orders/[id]/order-cancel-button.tsx
 *
 * 주문 취소 버튼 컴포넌트. pending 상태 주문에만 표시된다.
 * 클릭 시 확인 모달을 띄우고, 확인하면 /api/orders/[id] PATCH 로 cancelled 처리한다.
 * Client Component — 모달 열림 상태와 라우터 새로고침이 필요하다.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  orderId: string
}

export default function OrderCancelButton({ orderId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    console.log('[OrderCancelButton:handleCancel] 주문 취소 확정 시작', { orderId })
    setLoading(true)
    try {
      console.log('[OrderCancelButton:handleCancel] PATCH /api/orders/:id 요청')
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PATCH' })
      console.log('[OrderCancelButton:handleCancel] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '취소 실패')
      }
      console.log('[OrderCancelButton:handleCancel] 주문 취소 성공', { orderId })
      toast.success('주문이 취소되었습니다.')
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error('[OrderCancelButton:handleCancel] 취소 실패', { orderId, message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-10 px-5 rounded-lg border border-red-200 text-red-600 text-sm
          font-medium hover:bg-red-50 transition-colors"
      >
        주문 취소
      </button>

      {/* 확인 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
          />

          {/* 모달 */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400
                hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900">주문을 취소하시겠습니까?</h2>
            </div>

            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              취소된 주문은 복구할 수 없습니다.<br />
              배송 준비 이후에는 취소가 불가합니다.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 h-10 rounded-lg border border-zinc-300 text-sm
                  font-medium text-zinc-700 hover:bg-zinc-100 transition-colors
                  disabled:opacity-40"
              >
                돌아가기
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 h-10 rounded-lg bg-red-500 text-white text-sm
                  font-medium hover:bg-red-600 transition-colors disabled:opacity-60
                  disabled:cursor-not-allowed"
              >
                {loading ? '처리 중...' : '주문 취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
