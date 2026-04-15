/**
 * app/admin/products/page.tsx
 *
 * 어드민 상품 관리 페이지 (/admin/products).
 * 검색·카테고리·상태 필터를 쿼리 파라미터로 받아 Supabase에서 필터링된 상품 목록을 조회한다.
 * Server Component — URL 파라미터 기반 필터링을 서버에서 처리하고 AdminProductsClient 에 전달한다.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus, PackageSearch } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Product, Category } from '@/types'
import AdminProductsClient from './products-client'

export const metadata: Metadata = { title: '상품 관리' }

interface PageProps {
  searchParams: Promise<{ search?: string; category?: string; status?: string }>
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const { search = '', category = '', status = '' } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
  ])

  let query = supabase
    .from('products')
    .select('*, categories(id, name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('name', `%${search}%`)
  if (category) {
    const matched = (categories ?? []).find((c: Category) => c.id === category)
    if (matched) query = query.eq('category_id', matched.id)
  }
  if (status) {
    query = query.eq('status', status as Product['status'])
  } else {
    // 기본: 삭제된 상품 제외
    query = query.neq('status', 'deleted')
  }

  const { data: products, count } = await query

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">상품 관리</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            총 <span className="font-medium text-zinc-700">{count ?? 0}개</span>의 상품
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 text-white
            text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          상품 등록
        </Link>
      </div>

      {/* key 변경 시 컴포넌트 리마운트 → useState 재초기화 */}
      <AdminProductsClient
        key={`${search}|${category}|${status}`}
        products={products ?? []}
        categories={categories ?? []}
        currentSearch={search}
        currentCategory={category}
        currentStatus={status}
      />
    </div>
  )
}
