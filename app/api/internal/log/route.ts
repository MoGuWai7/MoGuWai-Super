/**
 * app/api/internal/log/route.ts
 *
 * 방문자 로그 수집 내부 API.
 * middleware.ts 에서 fire-and-forget 방식으로 호출된다.
 *
 * [보안]
 * X-Log-Key 헤더 값이 LOG_SECRET_KEY 환경변수와 일치할 때만 처리.
 * 외부에서 직접 호출해도 키 없이는 아무 것도 저장되지 않는다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** User-Agent 문자열에서 기기/OS/브라우저를 파싱 */
function parseUA(ua: string) {
  const isMobile = /Mobile|Android|iPhone/i.test(ua) && !/iPad/i.test(ua)
  const isTablet = /iPad|Tablet/i.test(ua)
  const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  const os = /Windows NT/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
      ? 'Android'
      : /iPhone/i.test(ua)
        ? 'iOS'
        : /iPad/i.test(ua)
          ? 'iPadOS'
          : /Mac OS X/i.test(ua)
            ? 'macOS'
            : /Linux/i.test(ua)
              ? 'Linux'
              : 'Unknown'

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR|Opera/i.test(ua)
      ? 'Opera'
      : /Chrome\/\d/i.test(ua)
        ? 'Chrome'
        : /Firefox\/\d/i.test(ua)
          ? 'Firefox'
          : /Safari\/\d/i.test(ua) && /Version\/\d/i.test(ua)
            ? 'Safari'
            : 'Unknown'

  return { device, os, browser }
}

export async function POST(request: NextRequest) {
  // 내부 키 검증
  const incomingKey = request.headers.get('x-log-key')
  if (!incomingKey || incomingKey !== process.env.LOG_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { ip, user_agent, path, referer, country, city } = body

    const { device, os, browser } = parseUA(user_agent ?? '')

    const supabase = createAdminClient()
    await supabase.from('access_logs').insert({
      ip: ip ?? 'unknown',
      user_agent: user_agent ?? '',
      device,
      os,
      browser,
      path: path ?? '/',
      referer: referer ?? '',
      country: country ?? '',
      city: city ?? '',
    })

    return NextResponse.json({ ok: true })
  } catch {
    // 로그 실패는 조용히 무시 (사이트 동작에 영향 없어야 함)
    return NextResponse.json({ ok: false })
  }
}
