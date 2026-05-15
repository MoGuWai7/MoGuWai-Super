/**
 * components/products/product-card.tsx
 *
 * 상품 목록에서 개별 상품을 표시하는 카드 컴포넌트.
 * 썸네일, 이름, 카테고리, 가격을 렌더링하고 상품 상세 페이지로 링크한다.
 * Server Component — 순수 표시용이므로 클라이언트 상태가 불필요하다.
 */

import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원'
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-xl border border-zinc-200
        shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-200 overflow-hidden"
    >
      {/* 썸네일 */}
      <div className="relative aspect-square bg-zinc-100 overflow-hidden">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="w-12 h-12"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3h18"
              />
            </svg>
          </div>
        )}

        {/* 품절 오버레이 */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-zinc-900 text-xs font-semibold px-3 py-1 rounded-full">
              품절
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex flex-col gap-1.5 p-3">
        {product.categories && (
          <span className="self-start text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
            {product.categories.name}
          </span>
        )}
        <p className="text-sm font-medium text-zinc-900 line-clamp-2 leading-snug">
          {product.name}
        </p>
        <p className="text-sm font-bold text-zinc-900">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  )
}
