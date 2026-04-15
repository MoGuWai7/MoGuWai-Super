/**
 * middleware.ts
 *
 * Next.js 미들웨어 — 모든 요청에 대해 실행되는 엣지 함수.
 *
 * [역할]
 * 1. Supabase 세션 갱신: getUser() 호출로 쿠키 기반 JWT 토큰을 자동 갱신
 * 2. 라우트 보호:
 *    - 비로그인 → PROTECTED_ROUTES / ADMIN_ROUTES 접근 시 /login 으로 리다이렉트
 *      (원래 경로를 ?redirect= 쿼리로 전달해 로그인 후 복귀 가능)
 *    - 로그인 → AUTH_ROUTES(/login, /signup) 접근 시 홈으로 리다이렉트
 * 3. 보안 헤더 부착 (모든 응답에 일괄 적용):
 *    - X-Frame-Options, X-Content-Type-Options, Referrer-Policy 등
 *    - Content-Security-Policy 는 Supabase/Storage 를 허용하도록 화이트리스트 구성
 *
 * [주의]
 * 어드민 role 체크는 미들웨어에서는 수행하지 않는다.
 * 일반 유저가 /admin 에 접근하면 app/admin/layout.tsx 에서 role 확인 후 홈으로 리다이렉트.
 *
 * [matcher]
 * 정적 파일(_next/static, 이미지, favicon)은 미들웨어 실행에서 제외해 불필요한 오버헤드를 방지한다.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 로그인 필요 라우트
const PROTECTED_ROUTES = ['/cart', '/orders', '/profile', '/checkout', '/mypage']
// 관리자 전용 라우트 (role 체크는 admin/layout.tsx 에서)
const ADMIN_ROUTES = ['/admin']
// 로그인 상태에서 접근 시 홈으로 리다이렉트
const AUTH_ROUTES = ['/login', '/signup']

/**
 * 모든 응답에 공통으로 부착할 보안 헤더.
 *
 * CSP: Supabase API/Storage, lucide-react inline SVG, Next.js dev 모드 eval 고려.
 *      개발 단계에서는 'unsafe-eval' 허용 (Next dev overlay 가 필요로 함),
 *      프로덕션 빌드에서는 제거한다.
 */
const isProd = process.env.NODE_ENV === 'production'

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ')

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': csp,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'on',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v)
  }
  return response
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()로 세션 갱신 + 유저 정보 취득
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
  const isAuthPage = AUTH_ROUTES.includes(pathname)

  // 비로그인 → 보호 라우트 접근 시 /login으로 리다이렉트 (원래 경로 저장)
  if (!user && (isProtected || isAdmin)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return applySecurityHeaders(NextResponse.redirect(redirectUrl))
  }

  // 로그인 상태 → /login·/signup 접근 시 홈으로 리다이렉트
  if (user && isAuthPage) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.search = ''
    return applySecurityHeaders(NextResponse.redirect(homeUrl))
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    // 정적 파일, 이미지, favicon 제외한 모든 경로
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
