/**
 * app/visit-log/page.tsx
 *
 * 비공개 방문자 로그 뷰어.
 * URL: /visit-log?key=LOG_SECRET_KEY
 *
 * 키가 틀리면 404. 맞으면 방문 로그 테이블과 통계를 표시.
 * Header/Footer 없는 독립 페이지 (루트 layout만 적용됨).
 */

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { DeleteAllButton } from './delete-button'

type AccessLog = {
  id: number
  ip: string
  device: string
  os: string
  browser: string
  path: string
  referer: string
  country: string
  city: string
  created_at: string
}

const DEVICE_ICON: Record<string, string> = {
  desktop: '🖥',
  mobile: '📱',
  tablet: '📋',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** ISO 3166-1 alpha-2 국가 코드 → 한국어 국가명 */
function getCountryName(code: string): string {
  if (!code) return '-'
  try {
    const names = new Intl.DisplayNames(['ko'], { type: 'region' })
    return names.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export default async function VisitLogPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; page?: string }>
}) {
  const params = await searchParams
  if (!params.key || params.key !== process.env.LOG_SECRET_KEY) {
    notFound()
  }

  const PAGE_SIZE = 100
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = createAdminClient()

  // 전체 카운트 + 페이지 데이터 + 오늘 방문수 병렬 조회
  const [
    { count: totalCount },
    { data: logs },
    { count: todayCount },
  ] = await Promise.all([
    supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })
      .gte(
        'created_at',
        new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString().slice(0, 10) +
          'T00:00:00+09:00',
      ),
  ])

  const total = totalCount ?? 0
  const today = todayCount ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // 기기 분포 (현재 페이지 기준)
  const deviceStats = (logs ?? []).reduce<Record<string, number>>((acc, log) => {
    const l = log as AccessLog
    acc[l.device] = (acc[l.device] ?? 0) + 1
    return acc
  }, {})

  const key = params.key

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-6">
      <div className="max-w-full mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">방문자 로그</h1>
            <p className="text-zinc-500 text-sm mt-0.5">moguwai-super · access_logs</p>
          </div>
          <div className="flex items-center gap-3">
            <DeleteAllButton secretKey={key} />
            <span className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
              PRIVATE
            </span>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="총 방문" value={total.toLocaleString()} />
          <StatCard label="오늘 방문 (KST)" value={today.toLocaleString()} />
          <StatCard
            label="데스크탑 (이 페이지)"
            value={`${deviceStats.desktop ?? 0}`}
            sub={`전체 ${(logs ?? []).length}건`}
          />
          <StatCard
            label="모바일 (이 페이지)"
            value={`${deviceStats.mobile ?? 0}`}
            sub={`태블릿 ${deviceStats.tablet ?? 0}`}
          />
        </div>

        {/* 국가 코드 안내 */}
        <p className="text-xs text-zinc-600 mb-3">
          국가 코드 참고:{' '}
          <a
            href="https://ko.wikipedia.org/wiki/ISO_3166-1_alpha-2"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
          >
            ISO 3166-1 alpha-2 전체 목록 (Wikipedia)
          </a>
          {' '}— 국가명은 한국어로 자동 변환됩니다.
        </p>

        {/* 로그 테이블 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">#</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">시각 (KST)</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">IP</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">국가</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">도시</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">기기</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">OS</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">브라우저</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap min-w-[200px]">경로</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap min-w-[260px]">유입</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((rawLog, i) => {
                  const log = rawLog as AccessLog
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-3 py-2 text-zinc-600 whitespace-nowrap">{from + i + 1}</td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                        {log.ip || '-'}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                        {getCountryName(log.country)}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{log.city || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-base" title={log.device}>
                          {DEVICE_ICON[log.device] ?? '?'}
                        </span>
                        <span className="text-zinc-500 ml-1">{log.device}</span>
                      </td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{log.os || '-'}</td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{log.browser || '-'}</td>
                      {/* 경로: 전체 표시, 긴 경우 줄바꿈 */}
                      <td className="px-3 py-2 text-emerald-400 break-all">
                        {log.path || '/'}
                      </td>
                      {/* 유입: 전체 URL 표시, 줄바꿈 허용 */}
                      <td className="px-3 py-2 text-zinc-400 break-all">
                        {log.referer || 'direct'}
                      </td>
                    </tr>
                  )
                })}
                {(logs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-zinc-600">
                      아직 기록된 방문이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
            <span>
              {from + 1}–{Math.min(to + 1, total)} / {total.toLocaleString()}건
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/visit-log?key=${key}&page=${page - 1}`}
                  className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
                >
                  ← 이전
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/visit-log?key=${key}&page=${page + 1}`}
                  className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
                >
                  다음 →
                </a>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-zinc-700 text-center">
          이 페이지는 공개되지 않은 비공개 URL입니다.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}
