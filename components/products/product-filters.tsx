/**
 * components/products/product-filters.tsx
 *
 * 상품 목록 페이지의 검색·카테고리·정렬 필터 컴포넌트.
 * 필터 변경 시 URL 쿼리 파라미터를 업데이트해 서버 컴포넌트가 재조회하도록 트리거한다.
 * Client Component — useSearchParams/useRouter 로 URL을 조작한다.
 */

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import type { Category } from '@/types'

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'price_asc', label: '낮은가격순' },
  { value: 'price_desc', label: '높은가격순' },
]

interface ProductFiltersProps {
  categories: Category[]
  currentCategory: string
  currentSort: string
  currentSearch: string
}

export default function ProductFilters({
  categories,
  currentCategory,
  currentSort,
  currentSearch,
}: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(currentSearch)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      // 필터 변경 시 페이지를 1로 리셋
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search: searchInput })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색바 */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상품명 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-zinc-300 text-sm
              outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-4 bg-zinc-900 text-white text-sm font-medium
            rounded-lg hover:bg-zinc-700 transition-colors"
        >
          검색
        </button>
        {currentSearch && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); updateParams({ search: '' }) }}
            className="h-10 px-3 border border-zinc-300 text-sm text-zinc-600
              rounded-lg hover:bg-zinc-100 transition-colors"
          >
            초기화
          </button>
        )}
      </form>

      {/* 카테고리 탭 + 정렬 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParams({ category: '' })}
            className={`h-8 px-4 rounded-full text-sm font-medium transition-colors
              ${!currentCategory
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50'
              }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParams({ category: cat.slug })}
              className={`h-8 px-4 rounded-full text-sm font-medium transition-colors
                ${currentCategory === cat.slug
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="relative w-full sm:w-auto">
          <select
            value={currentSort || 'latest'}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="w-full sm:w-auto h-9 pl-3 pr-8 rounded-lg border border-zinc-300 text-sm
              text-zinc-700 bg-white outline-none focus:ring-2 focus:ring-zinc-900
              focus:border-transparent appearance-none transition cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
