/**
 * lib/supabase/admin.ts
 *
 * 서비스 롤(Service Role) Supabase 클라이언트 생성 유틸.
 *
 * [사용처]
 * API Route에서만 사용한다. 절대 클라이언트 컴포넌트에서 import하지 말 것.
 *
 * [왜 필요한가]
 * 일부 작업(주문 취소 시 status 변경 등)은 RLS 정책상 anon key로는 실행 불가.
 * SUPABASE_SERVICE_ROLE_KEY 는 RLS를 우회하므로 서버 환경에서만 사용해야 한다.
 * 이 키는 NEXT_PUBLIC_ 접두사 없이 .env.local 에만 보관하여 클라이언트에 노출되지 않게 한다.
 */

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
