'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAllLogs } from './actions'

export function DeleteAllButton({ secretKey }: { secretKey: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('전체 로그를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return
    setLoading(true)
    try {
      await deleteAllLogs(secretKey)
      router.refresh()
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs px-3 py-1.5 bg-red-950 border border-red-800 text-red-400 rounded hover:bg-red-900 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? '삭제 중...' : '전체 삭제'}
    </button>
  )
}
