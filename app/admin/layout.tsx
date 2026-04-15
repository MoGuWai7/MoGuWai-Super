/**
 * app/admin/layout.tsx
 *
 * 어드민 영역 공통 레이아웃.
 *
 * [역할]
 * 1. 어드민 접근 권한 이중 검증
 *    - 미로그인: /login 리다이렉트
 *    - 일반 유저(role !== 'admin'): 홈(/) 리다이렉트
 *    (미들웨어는 로그인 여부만 검사하고, role 체크는 여기서 한다)
 * 2. AdminSidebar + 콘텐츠 영역 레이아웃 구성
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from './admin-sidebar'

export const metadata = { title: { default: '관리자', template: '%s | 관리자' } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  )
}
