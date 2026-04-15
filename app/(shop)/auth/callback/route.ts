import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

const log = logger.child({ route: 'GET /auth/callback' })

// Supabase 이메일 인증 링크 클릭 시 이 라우트로 code가 전달됨
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  log.debug('Auth 콜백 수신', { hasCode: !!code, next })

  if (code) {
    const supabase = await createClient()
    log.debug('코드를 세션으로 교환 시도')
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      log.info('인증 성공 — 리디렉트', { next })
      return NextResponse.redirect(`${origin}${next}`)
    }
    log.error('코드 교환 실패', { err: error.message })
  } else {
    log.warn('code 파라미터 없음')
  }

  // 코드가 없거나 교환 실패 시 에러 파라미터와 함께 로그인 페이지로
  log.warn('인증 콜백 실패 — 로그인 페이지로 리디렉트')
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
