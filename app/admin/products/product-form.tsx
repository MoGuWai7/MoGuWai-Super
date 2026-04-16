/**
 * app/admin/products/product-form.tsx  ('use client')
 *
 * 어드민 상품 등록/수정 폼 컴포넌트.
 *
 * [mode]
 * - 'create': POST /api/admin/products (새 상품 등록)
 * - 'edit':   PATCH /api/admin/products/[id] (기존 상품 수정)
 *
 * [이미지 업로드 방식]
 * 1. 파일 선택 → Supabase Storage(images 버킷)에 직접 업로드
 * 2. 업로드 완료 후 publicUrl 을 form.thumbnail_url 에 저장
 * 3. URL 직접 입력도 지원 (외부 이미지 URL 사용)
 *
 * [유효성 검사]
 * 상품명(필수) · 가격(0 이상) · 재고(0 이상) 를 클라이언트에서 사전 검사.
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload, X, Package, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Category, Product } from '@/types'

interface ProductFormProps {
  categories: Category[]
  initialData?: Partial<Product>
  mode: 'create' | 'edit'
  productId?: string
}

export default function ProductForm({
  categories,
  initialData,
  mode,
  productId,
}: ProductFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price?.toString() ?? '',
    stock: initialData?.stock?.toString() ?? '0',
    category_id: initialData?.category_id ?? '',
    status: initialData?.status ?? 'active',
    thumbnail_url: initialData?.thumbnail_url ?? '',
  })
  // slug를 수동으로 편집했는지 추적 (이름 변경 시 자동 갱신 여부 결정)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug)

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.thumbnail_url ?? '')

  /** 상품명에서 slug 자동 생성 */
  function generateSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    if (name === 'name' && !slugManuallyEdited) {
      // 이름 변경 시 slug 자동 갱신 (수동 편집 전까지만)
      setForm((prev) => ({ ...prev, name: value, slug: generateSlug(value) }))
    } else if (name === 'slug') {
      setSlugManuallyEdited(true)
      setForm((prev) => ({ ...prev, slug: value }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
    if (errors[name as keyof typeof form]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // 이미지 파일 업로드 (Supabase Storage)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 미리보기
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `products/${fileName}`

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: false })

      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setForm((prev) => ({ ...prev, thumbnail_url: publicUrl }))
      setPreviewUrl(publicUrl)
      toast.success('이미지가 업로드되었습니다.')
    } catch (err: any) {
      toast.error(`이미지 업로드 실패: ${err.message}`)
      setPreviewUrl(form.thumbnail_url)
    } finally {
      setUploading(false)
    }
  }

  function validate() {
    const newErrors: Partial<Record<keyof typeof form, string>> = {}
    if (!form.name.trim()) newErrors.name = '상품명을 입력해주세요.'
    if (!form.slug.trim()) newErrors.slug = '슬러그를 입력해주세요.'
    else if (!/^[a-z0-9가-힣-]+$/.test(form.slug.trim()))
      newErrors.slug = '소문자·숫자·한글·하이픈만 사용할 수 있습니다.'
    const priceNum = Number(form.price)
    if (!form.price || isNaN(priceNum) || priceNum < 0)
      newErrors.price = '올바른 가격을 입력해주세요.'
    const stockNum = Number(form.stock)
    if (form.stock === '' || isNaN(stockNum) || stockNum < 0)
      newErrors.stock = '올바른 재고를 입력해주세요.'
    return newErrors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        category_id: form.category_id || null,
        status: form.status,
        thumbnail_url: form.thumbnail_url.trim() || null,
      }

      let res: Response
      if (mode === 'create') {
        res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '저장 실패')
      }

      toast.success(mode === 'create' ? '상품이 등록되었습니다.' : '상품이 수정되었습니다.')
      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? '오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 왼쪽: 주요 정보 */}
        <div className="lg:col-span-2 space-y-5">

          {/* 상품명 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              상품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="상품명을 입력하세요"
              className={`w-full h-11 px-3.5 rounded-lg border text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                transition-colors ${errors.name ? 'border-red-400' : 'border-zinc-200'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              URL 슬러그 <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-zinc-400">
                /products/<span className="text-zinc-600">{form.slug || '슬러그'}</span>
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="product-name-here"
                className={`flex-1 h-11 px-3.5 rounded-lg border text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                  transition-colors ${errors.slug ? 'border-red-400' : 'border-zinc-200'}`}
              />
              <button
                type="button"
                onClick={() => {
                  setSlugManuallyEdited(false)
                  setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }))
                }}
                className="h-11 px-3 rounded-lg border border-zinc-200 text-xs text-zinc-500
                  hover:bg-zinc-100 transition-colors whitespace-nowrap"
              >
                이름으로 재생성
              </button>
            </div>
            {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              상품 설명
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="상품에 대한 자세한 설명을 입력하세요"
              rows={5}
              className="w-full px-3.5 py-3 rounded-lg border border-zinc-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                transition-colors resize-none"
            />
          </div>

          {/* 가격 + 재고 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                가격 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={`w-full h-11 px-3.5 rounded-lg border text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                  transition-colors ${errors.price ? 'border-red-400' : 'border-zinc-200'}`}
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                재고 (개) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={`w-full h-11 px-3.5 rounded-lg border text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                  transition-colors ${errors.stock ? 'border-red-400' : 'border-zinc-200'}`}
              />
              {errors.stock && <p className="mt-1 text-xs text-red-500">{errors.stock}</p>}
            </div>
          </div>

          {/* 카테고리 + 상태 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">카테고리</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className="w-full h-11 pl-3.5 pr-8 rounded-lg border border-zinc-200 text-sm
                  bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900
                  focus:border-transparent transition-colors cursor-pointer"
              >
                <option value="">카테고리 없음</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">상태</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full h-11 pl-3.5 pr-8 rounded-lg border border-zinc-200 text-sm
                  bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900
                  focus:border-transparent transition-colors cursor-pointer"
              >
                <option value="active">판매중</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
          </div>
        </div>

        {/* 오른쪽: 이미지 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">대표 이미지</label>

          {/* 미리보기 */}
          <div
            className="w-full aspect-square rounded-xl border-2 border-dashed border-zinc-200
              bg-zinc-50 overflow-hidden mb-3 relative group cursor-pointer"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="미리보기"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                  transition-opacity flex flex-col items-center justify-center gap-2">
                  <Upload className="w-6 h-6 text-white" />
                  <span className="text-xs text-white font-medium">이미지 변경</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2
                text-zinc-400">
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Package className="w-8 h-8" />
                    <span className="text-xs">클릭하여 업로드</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 파일 업로드 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-9 rounded-lg border border-zinc-200 text-xs font-medium
              text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 mb-2
              flex items-center justify-center gap-1.5"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 업로드 중...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> 파일 선택</>
            )}
          </button>

          {/* URL 직접 입력 */}
          <div className="relative">
            <input
              type="text"
              name="thumbnail_url"
              value={form.thumbnail_url}
              onChange={(e) => {
                handleChange(e)
                setPreviewUrl(e.target.value)
              }}
              placeholder="또는 이미지 URL 입력"
              className="w-full h-9 pl-3 pr-8 rounded-lg border border-zinc-200 text-xs
                focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                transition-colors"
            />
            {form.thumbnail_url && (
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, thumbnail_url: '' }))
                  setPreviewUrl('')
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400
                  hover:text-zinc-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="h-10 px-6 rounded-lg bg-zinc-900 text-white text-sm font-medium
            hover:bg-zinc-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'create' ? '상품 등록' : '변경사항 저장'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="h-10 px-4 rounded-lg border border-zinc-200 text-sm font-medium
            text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </form>
  )
}
