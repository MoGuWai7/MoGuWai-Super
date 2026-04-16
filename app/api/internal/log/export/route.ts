/**
 * app/api/internal/log/export/route.ts
 *
 * GET /api/internal/log/export?key=LOG_SECRET_KEY
 *
 * 전체 방문 로그를 CSV 파일로 다운로드.
 * 키 불일치 시 401 반환.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = ['#', '시각(KST)', 'IP', '국가', '도시', '기기', 'OS', '브라우저', '경로', '유입']
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.join(','),
    ...rows.map((row, i) => [
      i + 1,
      new Date(String(row.created_at)).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      row.ip,
      row.country,
      row.city,
      row.device,
      row.os,
      row.browser,
      row.path,
      row.referer || 'direct',
    ].map(escape).join(',')),
  ]
  return '\uFEFF' + lines.join('\r\n') // BOM 포함 (Excel 한글 깨짐 방지)
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!key || key !== process.env.LOG_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: logs, error } = await supabase
    .from('access_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const csv = toCSV((logs ?? []) as Record<string, unknown>[])

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="visit-logs-${today}.csv"`,
    },
  })
}
