/**
 * app/admin/products/products-client.tsx
 *
 * 어드민 상품 목록 인터랙션 클라이언트 컴포넌트.
 * 검색·필터 조작(URL 파라미터 업데이트), 상품 삭제(soft delete → status: 'deleted') 를 처리한다.
 * Client Component — useSearchParams 훅과 삭제 확인 모달 상태가 필요하다.
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Pencil, Trash2, Package, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product, Category } from '@/types'

const STATUS_MAP = {
  active: { label: '판매중', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  inactive: { label: '비활성', cls: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
  deleted: { label: '삭제됨', cls: 'bg-red-50 text-red-600 ring-red-200' },
}

const STATUS_TABS = [
  { value: '', label: '전체 (삭제 제외)' },
  { value: 'active', label: '판매중' },
  { value: 'inactive', label: '비활성' },
  { value: 'deleted', label: '삭제됨' },
]

interface Props {
  products: (Product & { categories?: Category | null })[]
  categories: Category[]
  currentSearch: string
  currentCategory: string
  currentStatus: string
}

export default function AdminProductsClient({
  products: initialProducts,
  categories,
  currentSearch,
  currentCategory,
  currentStatus,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState(initialProducts)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // URL 업데이트 헬퍼
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      console.log('[AdminProductsClient:updateParams] URL 파라미터 업데이트', { updates })
      const sp = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val) sp.set(key, val)
        else sp.delete(key)
      }
      const newUrl = `${pathname}?${sp.toString()}`
      console.log('[AdminProductsClient:updateParams] 이동 URL', { newUrl })
      router.push(newUrl)
    },
    [router, pathname, searchParams]
  )

  // 1단계: 판매 중지 (active → inactive)
  async function handleDeactivate(id: string, name: string) {
    console.log('[AdminProductsClient:handleDeactivate] 비활성화 시작', { productId: id, name })
    if (!confirm(`"${name}" 상품을 비활성으로 변경하시겠습니까?\n판매가 중지되며, 나중에 다시 활성화할 수 있습니다.`)) {
      console.log('[AdminProductsClient:handleDeactivate] 사용자 취소')
      return
    }
    setLoadingId(id)
    try {
      console.log('[AdminProductsClient:handleDeactivate] DELETE /api/admin/products/:id 요청 (soft delete)')
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      console.log('[AdminProductsClient:handleDeactivate] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '처리 실패')
      }
      setProducts((prev) =>
        prev.map((p) => p.id === id ? { ...p, status: 'inactive' as const } : p)
      )
      console.log('[AdminProductsClient:handleDeactivate] 상태 낙관적 업데이트 완료 (active → inactive)')
      toast.success('비활성으로 변경되었습니다.')
    } catch (err: any) {
      console.error('[AdminProductsClient:handleDeactivate] 비활성화 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  // 2단계: 완전 삭제 (inactive → deleted, 복구 불가)
  async function handlePermanentDelete(id: string, name: string) {
    console.log('[AdminProductsClient:handlePermanentDelete] deleted 상태 이동 시작', { productId: id, name })
    if (!confirm(`"${name}" 상품을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      console.log('[AdminProductsClient:handlePermanentDelete] 사용자 취소')
      return
    }
    setLoadingId(id)
    try {
      console.log('[AdminProductsClient:handlePermanentDelete] PATCH status=deleted 요청')
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deleted' }),
      })
      console.log('[AdminProductsClient:handlePermanentDelete] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '삭제 실패')
      }
      setProducts((prev) => prev.filter((p) => p.id !== id))
      console.log('[AdminProductsClient:handlePermanentDelete] 목록에서 제거 완료')
      toast.success('상품이 삭제되었습니다.')
    } catch (err: any) {
      console.error('[AdminProductsClient:handlePermanentDelete] 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  // 완전 삭제 (DB에서 영구 제거, status='deleted'인 상품만)
  async function handleHardDelete(id: string, name: string) {
    console.log('[AdminProductsClient:handleHardDelete] DB 완전 삭제 시작', { productId: id, name })
    if (!confirm(`"${name}" 상품을 DB에서 완전히 삭제하시겠습니까?\n주문 내역의 상품 정보가 사라지며 복구할 수 없습니다.`)) {
      console.log('[AdminProductsClient:handleHardDelete] 사용자 취소')
      return
    }
    setLoadingId(id)
    try {
      console.log('[AdminProductsClient:handleHardDelete] DELETE /api/admin/products/:id?hard=true 요청')
      const res = await fetch(`/api/admin/products/${id}?hard=true`, { method: 'DELETE' })
      console.log('[AdminProductsClient:handleHardDelete] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '삭제 실패')
      }
      setProducts((prev) => prev.filter((p) => p.id !== id))
      console.log('[AdminProductsClient:handleHardDelete] DB 완전 삭제 성공, 목록에서 제거')
      toast.success('상품이 완전히 삭제되었습니다.')
    } catch (err: any) {
      console.error('[AdminProductsClient:handleHardDelete] 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  // 활성화 복구 (inactive → active)
  async function handleActivate(id: string, name: string) {
    console.log('[AdminProductsClient:handleActivate] 활성화 복구 시작', { productId: id, name })
    setLoadingId(id)
    try {
      console.log('[AdminProductsClient:handleActivate] PATCH status=active 요청')
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      console.log('[AdminProductsClient:handleActivate] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '처리 실패')
      }
      setProducts((prev) =>
        prev.map((p) => p.id === id ? { ...p, status: 'active' as const } : p)
      )
      console.log('[AdminProductsClient:handleActivate] 낙관적 업데이트 완료 (inactive → active)')
      toast.success('판매중으로 변경되었습니다.')
    } catch (err: any) {
      console.error('[AdminProductsClient:handleActivate] 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      {/* 필터 바 */}
      <div className="flex gap-2 flex-wrap items-center mb-4">
        {/* 검색 */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const val = (e.currentTarget.elements.namedItem('search') as HTMLInputElement).value
            updateParams({ search: val, page: '' })
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            name="search"
            defaultValue={currentSearch}
            placeholder="상품명 검색"
            className="h-9 pl-9 pr-4 w-52 rounded-lg border border-zinc-200 text-sm
              placeholder:text-zinc-400 focus:outline-none focus:ring-2
              focus:ring-zinc-900 focus:border-transparent transition-colors"
          />
        </form>

        {/* 카테고리 필터 */}
        <select
          value={currentCategory}
          onChange={(e) => updateParams({ category: e.target.value, page: '' })}
          className="h-9 pl-3 pr-8 rounded-lg border border-zinc-200 text-sm text-zinc-700
            bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
            transition-colors cursor-pointer"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-0 border-b border-zinc-200 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams({ status: tab.value, page: '' })}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${currentStatus === tab.value
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-zinc-200 mb-3" />
          <p className="text-sm text-zinc-400">
            {currentSearch
              ? `"${currentSearch}"에 해당하는 상품이 없습니다.`
              : '등록된 상품이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">상품명</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">카테고리</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">가격</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">재고</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">등록일</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((product) => {
                  const status = STATUS_MAP[product.status] ?? STATUS_MAP.inactive
                  const isLoading = loadingId === product.id

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-zinc-50 transition-colors ${isLoading ? 'opacity-50' : ''}`}
                    >
                      {/* 상품명 + 썸네일 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 shrink-0 overflow-hidden">
                            {product.thumbnail_url ? (
                              <Image
                                src={product.thumbnail_url}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-4 h-4 text-zinc-300" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-zinc-900 line-clamp-1">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {product.categories?.name ?? (
                          <span className="text-zinc-300">미분류</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 whitespace-nowrap">
                        {product.price.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={product.stock <= 5 ? 'text-orange-500 font-medium' : 'text-zinc-700'}>
                          {product.stock.toLocaleString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                          text-xs font-medium ring-1 ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(product.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* 수정 (삭제됨 제외) */}
                          {product.status !== 'deleted' && (
                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              title="수정"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900
                                hover:bg-zinc-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          {/* 활성 → 비활성 (1단계) */}
                          {product.status === 'active' && (
                            <button
                              onClick={() => handleDeactivate(product.id, product.name)}
                              disabled={isLoading}
                              title="판매 중지 (비활성으로 변경)"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500
                                hover:bg-orange-50 transition-colors disabled:opacity-30
                                disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 비활성 → 활성 복구 + 소프트 삭제 (2단계) */}
                          {product.status === 'inactive' && (
                            <>
                              <button
                                onClick={() => handleActivate(product.id, product.name)}
                                disabled={isLoading}
                                title="판매중으로 복구"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600
                                  hover:bg-emerald-50 transition-colors disabled:opacity-30
                                  disabled:cursor-not-allowed"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(product.id, product.name)}
                                disabled={isLoading}
                                title="삭제됨으로 이동 (복구 불가)"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600
                                  hover:bg-red-50 transition-colors disabled:opacity-30
                                  disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* 삭제됨 → DB 완전 삭제 (hard delete) */}
                          {product.status === 'deleted' && (
                            <button
                              onClick={() => handleHardDelete(product.id, product.name)}
                              disabled={isLoading}
                              title="DB에서 완전 삭제 (복구 불가)"
                              className="p-1.5 rounded-lg text-red-300 hover:text-white
                                hover:bg-red-500 transition-colors disabled:opacity-30
                                disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
