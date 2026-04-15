/**
 * lib/admin/require-admin.ts
 *
 * 관리자 API 공통 인증 헬퍼.
 *
 * 이전에는 각 route.ts 파일마다 동일한 requireAdmin 함수를 복사해서 썼다.
 * 여기로 모아 한 번만 정의하고, role 체크 실패 시 바로 NextResponse 를 반환한다.
 *
 * [사용]
 *   const auth = await requireAdmin()
 *   if ('response' in auth) return auth.response
 *   const { user, supabase } = auth
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'requireAdmin' })

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type AuthFailure = { response: NextResponse }
type AuthSuccess = {
  user: { id: string; email?: string | null }
  supabase: SupabaseServerClient
}

export async function requireAdmin(): Promise<AuthFailure | AuthSuccess> {
  log.debug('관리자 인증 검사 시작')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  log.debug('세션 유저 확인', { authenticated: !!user, userId: user?.id })

  if (!user) {
    log.warn('비로그인 요청 — 401 반환')
    return {
      response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }),
    }
  }

  log.debug('users 테이블에서 role 조회', { userId: user.id })
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  log.debug('role 조회 결과', { userId: user.id, role: profile?.role })

  if (profile?.role !== 'admin') {
    log.warn('admin 아닌 role — 403 반환', { userId: user.id, role: profile?.role })
    return {
      response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }),
    }
  }

  log.debug('관리자 인증 통과', { userId: user.id, email: user.email })
  return { user: { id: user.id, email: user.email }, supabase }
}
