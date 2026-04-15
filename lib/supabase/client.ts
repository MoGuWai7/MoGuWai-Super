/**
 * lib/supabase/client.ts
 *
 * 클라이언트 사이드 Supabase 클라이언트 생성 유틸.
 *
 * [사용처]
 * 'use client' 가 선언된 컴포넌트에서만 사용한다.
 * createBrowserClient 는 브라우저 환경에서 localStorage/쿠키로 세션을 관리한다.
 *
 * 서버 환경(Server Component, API Route)에서는 lib/supabase/server.ts 를 사용할 것.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
