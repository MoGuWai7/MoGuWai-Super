/**
 * app/(shop)/page.tsx
 *
 * 쇼핑몰 메인 홈 페이지 (/).
 * 히어로 배너, 카테고리 목록, 신상품 그리드를 서버에서 렌더링한다.
 * Server Component — Supabase 쿼리를 직접 실행해 초기 렌더에 데이터를 포함시킨다.
 */

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/products/product-card'
import type { Product, Category } from '@/types'

export const metadata: Metadata = { title: 'MoGuWai Super' }

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: newProducts }, { data: activeProducts }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('products')
      .select('*, categories(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('category_id')
      .eq('status', 'active'),
  ])

  // 활성 상품이 1개 이상인 카테고리만 표시
  const activeCategoryIds = new Set(
    (activeProducts ?? []).map((p) => p.category_id).filter(Boolean)
  )
  const visibleCategories = (categories ?? [] as Category[]).filter(
    (cat) => activeCategoryIds.has(cat.id)
  )

  return (
    <div className="flex flex-col">

      {/* 히어로 배너 */}
      <section className="relative text-white overflow-hidden h-[360px] sm:h-[480px]">
        <Image
          src="https://picsum.photos/seed/hero/1920/600"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl">
              <p className="text-white/60 text-sm font-medium tracking-widest uppercase mb-4">
                New Arrivals
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6">
                원하는 모든 것,<br />
                한 곳에서
              </h1>
              <p className="text-white/70 text-base mb-8 leading-relaxed">
                다양한 카테고리의 상품을 합리적인 가격에 만나보세요.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-lg
                  bg-white text-zinc-900 text-sm font-semibold
                  hover:bg-zinc-100 transition-colors"
              >
                전체 상품 보기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 바로가기 */}
      {visibleCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <h2 className="text-xl font-bold text-zinc-900 mb-5">카테고리</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl
                  border border-zinc-200 bg-white shadow-sm
                  hover:border-zinc-400 hover:shadow-md transition-all duration-200 group"
              >
                <span className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-900">
                  {cat.name}
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700
                  group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 신상품 섹션 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-0 w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-zinc-900">신상품</h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-medium text-zinc-500
              hover:text-zinc-900 transition-colors"
          >
            전체 보기
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!newProducts || newProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-zinc-200 mb-3" />
            <p className="text-sm text-zinc-400">등록된 상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(newProducts as Product[]).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
