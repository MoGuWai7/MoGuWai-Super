/**
 * lib/cache/products.ts
 *
 * 상품 목록/카테고리 조회를 Next.js `unstable_cache` 로 감싸는 래퍼.
 *
 * [왜 캐시하는가]
 * 상품 목록과 카테고리는 같은 쿼리가 방문자마다 반복 실행된다.
 * Postgres 왕복 비용을 절감하려고 Next.js in-memory/ISR 캐시에 결과를 보관한다.
 *
 * [무효화]
 * 관리자 측 쓰기(상품/카테고리 생성·수정·삭제) 직후
 * `revalidateTag(PRODUCTS_CACHE_TAG)` 를 호출하면 다음 요청부터 재조회된다.
 *
 * [주의]
 * - `unstable_cache` 는 요청 쿠키에 의존하는 Supabase 세션 컨텍스트를 들고 갈 수 없다.
 *   따라서 **공개 데이터**(status='active' 상품·전체 카테고리) 쿼리에만 사용한다.
 * - 개인화가 필요한 데이터(장바구니, 마이페이지)에는 절대 사용하지 않는다.
 * - 캐시 내부에서는 anon 키로 공개 쿼리를 수행하기 위해
 *   요청 쿠키 없이 `createClient` 를 호출한다.
 */

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'
import type { Category, Product } from '@/types'

const log = logger.child({ module: 'cache/products' })

/** 상품 관련 모든 캐시 항목의 무효화 태그 */
export const PRODUCTS_CACHE_TAG = 'products'

/** 쿠키 없이 anon 키로 공개 쿼리 전용 클라이언트 생성 */
function createAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

/**
 * 전체 카테고리 목록 (이름 오름차순).
 * - 재검증: 5분 or 태그 무효화
 */
export const getCategoriesCached = unstable_cache(
  async (): Promise<Category[]> => {
    log.debug('getCategoriesCached 실행 — 캐시 미스 또는 재검증')
    const supabase = createAnonClient()
    const { data } = await supabase.from('categories').select('*').order('name')
    const result = (data ?? []) as Category[]
    log.debug('카테고리 조회 완료', { count: result.length })
    return result
  },
  ['categories:all'],
  { revalidate: 300, tags: [PRODUCTS_CACHE_TAG] }
)

export type ProductListParams = {
  search: string
  categorySlug: string
  sort: 'latest' | 'price_asc' | 'price_desc'
  page: number
  pageSize: number
}

export type ProductListResult = {
  products: Product[]
  count: number
}

/**
 * 상품 목록 — 필터 조건별 캐시 키 자동 분기.
 * search/category/sort/page 를 키에 포함해 조합별로 별도 캐시된다.
 */
export const getProductsCached = unstable_cache(
  async (params: ProductListParams): Promise<ProductListResult> => {
    log.debug('getProductsCached 실행 — 캐시 미스 또는 재검증', {
      search: params.search || '(없음)',
      categorySlug: params.categorySlug || '(전체)',
      sort: params.sort,
      page: params.page,
      pageSize: params.pageSize,
    })
    const supabase = createAnonClient()

    // 카테고리 slug → id 변환
    let categoryId: string | null = null
    if (params.categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', params.categorySlug)
        .maybeSingle()
      categoryId = cat?.id ?? null
      log.debug('카테고리 slug → id 변환', { slug: params.categorySlug, categoryId })
    }

    let query = supabase
      .from('products')
      .select('*, categories(*)', { count: 'exact' })
      .eq('status', 'active')

    if (params.search) query = query.ilike('name', `%${params.search}%`)
    if (categoryId) query = query.eq('category_id', categoryId)

    if (params.sort === 'price_asc') query = query.order('price', { ascending: true })
    else if (params.sort === 'price_desc') query = query.order('price', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    const from = (params.page - 1) * params.pageSize
    const to = from + params.pageSize - 1
    query = query.range(from, to)
    log.debug('쿼리 범위', { from, to })

    const { data, count } = await query
    const result = { products: (data ?? []) as Product[], count: count ?? 0 }
    log.debug('상품 목록 조회 완료', { productCount: result.products.length, totalCount: result.count })
    return result
  },
  ['products:list'],
  { revalidate: 60, tags: [PRODUCTS_CACHE_TAG] }
)
