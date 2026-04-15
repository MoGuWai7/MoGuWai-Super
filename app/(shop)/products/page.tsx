/**
 * app/(shop)/products/page.tsx
 *
 * 상품 목록 페이지 (/products).
 *
 * [기능]
 * - searchParams 기반 필터: search(상품명 ilike), category(slug), sort(최신순/가격순)
 * - 서버 사이드 페이지네이션 (PAGE_SIZE = 12, range() 쿼리 활용)
 * - ProductFilters(클라이언트)를 Suspense 로 감싸 스트리밍 렌더링
 *
 * [하위 컴포넌트]
 * - ProductFilters: URL 파라미터 기반 필터 UI (useSearchParams 사용)
 * - ProductCard: 상품 카드
 * - Pagination: 페이지 번호 목록 (ellipsis 처리 포함)
 * - EmptyState: 검색 결과 없음 UI
 */

import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/components/products/product-card'
import ProductFilters from '@/components/products/product-filters'
import type { Product } from '@/types'
import { getCategoriesCached, getProductsCached } from '@/lib/cache/products'

export const metadata: Metadata = { title: '상품 목록' }

const PAGE_SIZE = 12

interface PageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    sort?: string
    page?: string
  }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search ?? ''
  const category = params.category ?? ''
  const sortParam = params.sort ?? 'latest'
  const sort: 'latest' | 'price_asc' | 'price_desc' =
    sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'latest'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  // 공개 데이터 — `unstable_cache` 로 태그 기반 캐싱 (revalidateTag('products') 로 무효화)
  const [categories, { products, count }] = await Promise.all([
    getCategoriesCached(),
    getProductsCached({
      search,
      categorySlug: category,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams()
    if (search) sp.set('search', search)
    if (category) sp.set('category', category)
    if (sort !== 'latest') sp.set('sort', sort)
    if (p > 1) sp.set('page', String(p))
    const qs = sp.toString()
    return `/products${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">상품 목록</h1>
        <p className="text-sm text-zinc-500 mt-1">
          총 <span className="font-medium text-zinc-700">{count.toLocaleString('ko-KR')}개</span>의 상품
        </p>
      </div>

      {/* 필터 */}
      <div className="mb-6">
        <Suspense>
          <ProductFilters
            categories={categories}
            currentCategory={category}
            currentSort={sort}
            currentSearch={search}
          />
        </Suspense>
      </div>

      {/* 상품 그리드 */}
      {products.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              buildPageUrl={buildPageUrl}
            />
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <PackageSearch className="w-16 h-16 text-zinc-300 mb-4" />
      <h2 className="text-lg font-semibold text-zinc-700 mb-2">
        {search ? `"${search}"에 대한 검색 결과가 없습니다` : '등록된 상품이 없습니다'}
      </h2>
      <p className="text-sm text-zinc-400 mb-6">
        {search ? '다른 검색어나 카테고리를 선택해보세요.' : '곧 새로운 상품이 등록될 예정입니다.'}
      </p>
      <Link
        href="/products"
        className="h-9 px-4 rounded-lg border border-zinc-300 text-sm font-medium
          text-zinc-700 hover:bg-zinc-100 transition-colors"
      >
        전체 상품 보기
      </Link>
    </div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  buildPageUrl,
}: {
  currentPage: number
  totalPages: number
  buildPageUrl: (p: number) => string
}) {
  const delta = 2
  const pages: (number | '...')[] = []

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i)
    } else if (
      pages[pages.length - 1] !== '...'
    ) {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      <Link
        href={buildPageUrl(currentPage - 1)}
        aria-disabled={currentPage === 1}
        className={`flex items-center justify-center w-9 h-9 rounded-lg border text-sm
          transition-colors
          ${currentPage === 1
            ? 'border-zinc-200 text-zinc-300 pointer-events-none'
            : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
          }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-zinc-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildPageUrl(p)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium
              transition-colors
              ${p === currentPage
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-100'
              }`}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={buildPageUrl(currentPage + 1)}
        aria-disabled={currentPage === totalPages}
        className={`flex items-center justify-center w-9 h-9 rounded-lg border text-sm
          transition-colors
          ${currentPage === totalPages
            ? 'border-zinc-200 text-zinc-300 pointer-events-none'
            : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
          }`}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
