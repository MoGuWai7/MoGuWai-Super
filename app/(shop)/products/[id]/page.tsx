/**
 * app/(shop)/products/[id]/page.tsx
 *
 * 상품 상세 페이지 (/products/[id]).
 *
 * [구성]
 * - 브레드크럼: 홈 > 상품 목록 > 카테고리 > 상품명
 * - ProductGallery: 썸네일 + 추가 이미지 갤러리 (클라이언트 컴포넌트)
 * - 상품 정보: 카테고리 뱃지 · 상품명 · 가격 · 설명
 * - ProductActions: 수량 선택 + 장바구니/바로구매 버튼 (클라이언트 컴포넌트)
 *
 * [generateMetadata]
 * 상품명/설명을 동적으로 메타태그에 주입해 SEO를 최적화한다.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductGallery from '@/components/products/product-gallery'
import ProductActions from '@/components/products/product-actions'
import type { Product } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, description')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!product) return { title: '상품을 찾을 수 없음' }

  return {
    title: product.name,
    description: product.description || undefined,
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!product) notFound()

  const p = product as Product

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* 브레드크럼 */}
      <nav className="flex items-center flex-wrap gap-1.5 text-sm text-zinc-400 mb-6">
        <Link href="/" className="hover:text-zinc-600 transition-colors">홈</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/products" className="hover:text-zinc-600 transition-colors">상품 목록</Link>
        {p.categories && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/products?category=${p.categories.slug}`}
              className="hover:text-zinc-600 transition-colors"
            >
              {p.categories.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-600 truncate max-w-40">{p.name}</span>
      </nav>

      {/* 상품 콘텐츠 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

        {/* 좌: 이미지 갤러리 */}
        <ProductGallery
          thumbnailUrl={p.thumbnail_url}
          images={p.images}
          productName={p.name}
        />

        {/* 우: 상품 정보 */}
        <div className="flex flex-col gap-5">

          {/* 카테고리 뱃지 */}
          {p.categories && (
            <span className="self-start text-xs font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
              {p.categories.name}
            </span>
          )}

          {/* 상품명 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 leading-snug">
            {p.name}
          </h1>

          {/* 가격 */}
          <p className="text-3xl font-bold text-zinc-900">
            {p.price.toLocaleString('ko-KR')}
            <span className="text-xl font-semibold ml-1">원</span>
          </p>

          <hr className="border-zinc-200" />

          {/* 상품 설명 */}
          {p.description && (
            <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
              {p.description}
            </div>
          )}

          <hr className="border-zinc-200" />

          {/* 수량 + 장바구니 + 바로구매 */}
          <ProductActions
            productId={p.id}
            stock={p.stock}
            price={p.price}
          />
        </div>
      </div>
    </div>
  )
}
