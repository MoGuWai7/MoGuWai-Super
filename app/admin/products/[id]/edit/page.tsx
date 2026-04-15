/**
 * app/admin/products/[id]/edit/page.tsx
 *
 * 상품 수정 페이지 (/admin/products/[id]/edit).
 * URL의 id로 기존 상품 데이터와 카테고리 목록을 서버에서 조회해 ProductForm 에 초기값으로 전달한다.
 * Server Component — 존재하지 않는 상품 id면 notFound() 로 404 처리한다.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductForm from '../../product-form'

export const metadata: Metadata = { title: '상품 수정' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('categories').select('*').order('name'),
  ])

  if (!product) notFound()

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
        <h1 className="text-xl font-bold text-zinc-900">상품 수정</h1>
        <p className="text-sm text-zinc-500 mt-0.5 truncate max-w-sm">{product.name}</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <ProductForm
          categories={categories ?? []}
          initialData={product}
          mode="edit"
          productId={product.id}
        />
      </div>
    </div>
  )
}
