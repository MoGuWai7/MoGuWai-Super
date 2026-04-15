/**
 * components/logout-button.tsx
 *
 * 로그아웃 버튼 공용 컴포넌트.
 * Supabase Auth signOut 호출 후 홈(/)으로 리디렉션한다.
 * Client Component — 클릭 이벤트 핸들러와 라우터가 필요하다.
 */

'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    console.log('[LogoutButton:handleLogout] 로그아웃 시작')
    const supabase = createClient()
    await supabase.auth.signOut()
    console.log('[LogoutButton:handleLogout] signOut 완료 — 로그인 페이지로 이동')
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 h-9 px-4 rounded-lg border border-zinc-300
        text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      로그아웃
    </button>
  )
}
