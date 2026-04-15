/**
 * lib/supabase/server.ts
 *
 * 서버 사이드 Supabase 클라이언트 생성 유틸.
 *
 * [사용처]
 * Server Component, API Route, middleware 등 서버 환경에서 호출한다.
 * 쿠키를 통해 사용자 세션을 읽고, 필요 시 갱신한다.
 *
 * [주의]
 * Server Component 에서 호출된 경우 쿠키 쓰기(setAll)가 불가능하므로
 * try/catch 로 조용히 무시한다. 세션 갱신은 middleware 에서 담당한다.
 *
 * 클라이언트 컴포넌트에서는 lib/supabase/client.ts 를 사용할 것.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 쿠키 쓰기가 불가능하므로 무시
          }
        },
      },
    }
  )
}
