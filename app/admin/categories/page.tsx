/**
 * app/admin/categories/page.tsx
 *
 * 어드민 카테고리 관리 페이지 (/admin/categories).
 * 카테고리 목록과 각 카테고리의 상품 수를 서버에서 조회해 CategoriesClient 에 전달한다.
 * Server Component — 데이터 페칭만 담당하고 CRUD 인터랙션은 CategoriesClient 에서 처리한다.
 */

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CategoriesClient from './categories-client'

export const metadata: Metadata = { title: '카테고리 관리' }

export default async function AdminCategoriesPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('products').select('category_id').neq('status', 'deleted'),
  ])

  const categoriesWithCount = (categories ?? []).map((cat) => ({
    ...cat,
    product_count: (products ?? []).filter((p) => p.category_id === cat.id).length,
  }))

  return <CategoriesClient initialCategories={categoriesWithCount} />
}
