/**
 * app/admin/categories/categories-client.tsx
 *
 * 카테고리 CRUD 인터랙션 클라이언트 컴포넌트.
 * 추가·인라인 수정·삭제를 API Routes(/api/admin/categories) 를 통해 처리한다.
 * Client Component — 낙관적 UI 업데이트와 인라인 편집 상태가 필요하다.
 */

'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category } from '@/types'

type CategoryWithCount = Category & { product_count: number }

interface Props {
  initialCategories: CategoryWithCount[]
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // 추가 폼 상태
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')

  // 수정 폼 상태
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')

  const [loading, setLoading] = useState(false)

  // 추가
  async function handleAdd() {
    console.log('[CategoriesClient:handleAdd] 카테고리 추가 시작', { name: newName, slug: newSlug })
    if (!newName.trim() || !newSlug.trim()) {
      console.log('[CategoriesClient:handleAdd] 필수 입력값 누락 — 중단')
      toast.error('이름과 슬러그를 모두 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      console.log('[CategoriesClient:handleAdd] POST /api/admin/categories 요청', { name: newName.trim(), slug: newSlug.trim() })
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      })
      console.log('[CategoriesClient:handleAdd] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '추가 실패')
      }
      const { category } = await res.json()
      setCategories((prev) =>
        [...prev, { ...category, product_count: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      )
      console.log('[CategoriesClient:handleAdd] 카테고리 추가 성공', { categoryId: category.id })
      setNewName('')
      setNewSlug('')
      setShowAddForm(false)
      toast.success('카테고리가 추가되었습니다.')
    } catch (err: any) {
      console.error('[CategoriesClient:handleAdd] 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 수정 시작
  function startEdit(cat: CategoryWithCount) {
    console.log('[CategoriesClient:startEdit] 인라인 편집 모드 진입', { categoryId: cat.id, name: cat.name, slug: cat.slug })
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditSlug(cat.slug)
  }

  // 수정 저장
  async function handleEdit(id: string) {
    console.log('[CategoriesClient:handleEdit] 카테고리 수정 저장 시작', { categoryId: id, name: editName, slug: editSlug })
    if (!editName.trim() || !editSlug.trim()) {
      console.log('[CategoriesClient:handleEdit] 필수 입력값 누락 — 중단')
      toast.error('이름과 슬러그를 모두 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      console.log('[CategoriesClient:handleEdit] PATCH /api/admin/categories/:id 요청')
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
      })
      console.log('[CategoriesClient:handleEdit] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '수정 실패')
      }
      const { category } = await res.json()
      setCategories((prev) =>
        prev
          .map((c) =>
            c.id === id ? { ...c, name: category.name, slug: category.slug } : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      console.log('[CategoriesClient:handleEdit] 수정 성공, 인라인 편집 종료')
      setEditingId(null)
      toast.success('카테고리가 수정되었습니다.')
    } catch (err: any) {
      console.error('[CategoriesClient:handleEdit] 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 삭제
  async function handleDelete(id: string, name: string, count: number) {
    console.log('[CategoriesClient:handleDelete] 카테고리 삭제 시작', { categoryId: id, name, productCount: count })
    if (count > 0) {
      console.log('[CategoriesClient:handleDelete] 소속 상품 있음 — 삭제 거부', { count })
      toast.error(`이 카테고리에 상품이 ${count}개 있어 삭제할 수 없습니다.`)
      return
    }
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) {
      console.log('[CategoriesClient:handleDelete] 사용자 취소')
      return
    }
    setLoading(true)
    try {
      console.log('[CategoriesClient:handleDelete] DELETE /api/admin/categories/:id 요청')
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      console.log('[CategoriesClient:handleDelete] 응답 수신', { status: res.status, ok: res.ok })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '삭제 실패')
      }
      setCategories((prev) => prev.filter((c) => c.id !== id))
      console.log('[CategoriesClient:handleDelete] 삭제 성공, 목록에서 제거')
      toast.success('카테고리가 삭제되었습니다.')
    } catch (err: any) {
      console.error('[CategoriesClient:handleDelete] 실패', { message: err.message })
      toast.error(err.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">카테고리 관리</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            총 <span className="font-medium text-zinc-700">{categories.length}개</span>의 카테고리
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null) }}
          disabled={showAddForm}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 text-white
            text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          카테고리 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">새 카테고리</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-zinc-500 mb-1">카테고리명</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (!newSlug) setNewSlug(generateSlug(e.target.value))
                }}
                placeholder="예: 전자기기"
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-zinc-500 mb-1">슬러그</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="예: electronics"
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium
                  hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                추가
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewName(''); setNewSlug('') }}
                className="h-9 px-3 rounded-lg border border-zinc-200 text-sm text-zinc-600
                  hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tag className="w-12 h-12 text-zinc-200 mb-3" />
          <p className="text-sm text-zinc-400">등록된 카테고리가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500">카테고리명</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">슬러그</th>
                <th className="text-center px-4 py-3 font-medium text-zinc-500">상품 수</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50 transition-colors">
                  {editingId === cat.id ? (
                    /* 인라인 편집 */
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 text-sm
                            focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 text-sm font-mono
                            focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-zinc-500">
                        {cat.product_count}개
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(cat.id)}
                            disabled={loading}
                            className="h-7 px-3 rounded-lg bg-zinc-900 text-white text-xs font-medium
                              hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="h-7 px-2 rounded-lg border border-zinc-200 text-zinc-500
                              hover:bg-zinc-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* 일반 행 */
                    <>
                      <td className="px-4 py-3 font-medium text-zinc-900">{cat.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{cat.slug}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5
                          rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                          {cat.product_count}개
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(cat)}
                            title="수정"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900
                              hover:bg-zinc-100 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name, cat.product_count)}
                            title="삭제"
                            disabled={cat.product_count > 0}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600
                              hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
