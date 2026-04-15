/**
 * app/admin/products/new/page.tsx
 *
 * 새 상품 등록 페이지 (/admin/products/new).
 * 카테고리 목록을 서버에서 조회해 ProductForm 에 전달한다.
 * Server Component — 폼 렌더 전 카테고리 데이터를 미리 로드한다.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductForm from '../product-form'

export const metadata: Metadata = { title: '상품 등록' }

export default async function AdminProductNewPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="p-6 lg:p-8">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500
          hover:text-zinc-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        상품 목록
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">상품 등록</h1>
        <p className="text-sm text-zinc-500 mt-0.5">새로운 상품을 등록합니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <ProductForm
          categories={categories ?? []}
          mode="create"
        />
      </div>
    </div>
  )
}
