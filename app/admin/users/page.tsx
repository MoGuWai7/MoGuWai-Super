/**
 * app/admin/users/page.tsx
 *
 * 어드민 회원 관리 페이지.
 *
 * [기능]
 * - 이름/이메일 검색 (searchParams.search → ilike 쿼리)
 * - 회원 목록 테이블: 이름 · 이메일 · 역할(관리자/일반) · 주문 수 · 가입일
 *
 * [주문 수 계산]
 * orders 테이블에서 user_id 목록을 가져와 클라이언트에서 집계 (orderCountMap).
 * 대용량이면 DB aggregate 쿼리로 전환하는 것이 성능상 유리하다.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '회원 관리' }

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { search = '' } = await searchParams

  const supabase = await createClient()

  let userQuery = supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false })

  if (search) {
    userQuery = userQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const [{ data: users }, { data: orderCounts }] = await Promise.all([
    userQuery,
    supabase.from('orders').select('user_id'),
  ])

  // user_id별 주문 수 계산
  const orderCountMap: Record<string, number> = {}
  for (const o of orderCounts ?? []) {
    orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1
  }

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">회원 관리</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            총 <span className="font-medium text-zinc-700">{users?.length ?? 0}명</span>
          </p>
        </div>
      </div>

      {/* 검색 */}
      <form className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="이름 또는 이메일 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-zinc-200 text-sm
              placeholder:text-zinc-400 focus:outline-none focus:ring-2
              focus:ring-zinc-900 focus:border-transparent transition-colors"
          />
        </div>
      </form>

      {/* 테이블 */}
      {!users || users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-zinc-200 mb-3" />
          <p className="text-sm text-zinc-400">
            {search ? `"${search}"에 해당하는 회원이 없습니다.` : '등록된 회원이 없습니다.'}
          </p>
          {search && (
            <Link
              href="/admin/users"
              className="mt-3 text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
            >
              전체 목록 보기
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">이름</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">이메일</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">역할</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">주문 수</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{user.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1
                          ${user.role === 'admin'
                            ? 'bg-zinc-900 text-white ring-zinc-900'
                            : 'bg-zinc-50 text-zinc-600 ring-zinc-200'
                          }`}
                      >
                        {user.role === 'admin' ? '관리자' : '일반'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-zinc-900">
                        {(orderCountMap[user.id] ?? 0).toLocaleString('ko-KR')}
                      </span>
                      <span className="text-zinc-400">건</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
