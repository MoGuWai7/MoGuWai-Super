/**
 * components/products/product-gallery.tsx
 *
 * 상품 상세 페이지의 이미지 갤러리 컴포넌트.
 * 메인 이미지와 썸네일 목록을 표시하며, 썸네일 클릭 시 메인 이미지가 전환된다.
 * Client Component — 선택된 이미지 인덱스 상태가 필요하다.
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProductGalleryProps {
  thumbnailUrl: string | null
  images: string[]
  productName: string
}

export default function ProductGallery({
  thumbnailUrl,
  images,
  productName,
}: ProductGalleryProps) {
  const allImages = [
    ...(thumbnailUrl ? [thumbnailUrl] : []),
    ...images.filter((img) => img !== thumbnailUrl),
  ]

  const [selected, setSelected] = useState(0)

  const current = allImages[selected] ?? null

  return (
    <div className="flex flex-col gap-3">
      {/* 메인 이미지 */}
      <div className="relative aspect-square rounded-xl border border-zinc-200 bg-zinc-100 overflow-hidden">
        {current ? (
          <Image
            src={current}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="w-16 h-16"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3h18"
              />
            </svg>
          </div>
        )}
      </div>

      {/* 썸네일 스트립 */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden
                transition-colors
                ${idx === selected ? 'border-zinc-900' : 'border-zinc-200 hover:border-zinc-400'}`}
            >
              <Image
                src={img}
                alt={`${productName} ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
