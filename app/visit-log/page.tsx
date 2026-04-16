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

  // 전체 카운트 + 페이지 데이터 병렬 조회
  const [{ count }, { data: logs }, { data: todayData }] = await Promise.all([
    supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to),
    // 오늘 방문 수 (KST 기준 → UTC로 계산)
    supabase
      .from('access_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString().slice(0, 10) + 'T00:00:00+09:00'),
  ])

  const totalCount = count ?? 0
  const todayCount = (todayData as unknown as { count: number } | null)?.count
    ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // 기기 비율 계산 (현재 페이지 기준)
  const deviceStats = (logs ?? []).reduce<Record<string, number>>((acc, log) => {
    const l = log as AccessLog
    acc[l.device] = (acc[l.device] ?? 0) + 1
    return acc
  }, {})

  const key = params.key

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-6">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">방문자 로그</h1>
            <p className="text-zinc-500 text-sm mt-0.5">moguwai-super · access_logs</p>
          </div>
          <span className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
            PRIVATE
          </span>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="총 방문" value={totalCount.toLocaleString()} />
          <StatCard label="오늘 방문 (KST)" value={todayCount.toLocaleString()} />
          <StatCard
            label="데스크탑"
            value={`${deviceStats.desktop ?? 0}`}
            sub={`/ 이 페이지 ${(logs ?? []).length}건`}
          />
          <StatCard
            label="모바일"
            value={`${deviceStats.mobile ?? 0}`}
            sub={`태블릿 ${deviceStats.tablet ?? 0}`}
          />
        </div>

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
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">경로</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">유입</th>
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
                      <td className="px-3 py-2 text-zinc-600">{from + i + 1}</td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-300 whitespace-nowrap font-mono">
                        {log.ip || '-'}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{log.country || '-'}</td>
                      <td className="px-3 py-2 text-zinc-400">{log.city || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-base" title={log.device}>
                          {DEVICE_ICON[log.device] ?? '?'}
                        </span>
                        <span className="text-zinc-500 ml-1">{log.device}</span>
                      </td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{log.os || '-'}</td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{log.browser || '-'}</td>
                      <td className="px-3 py-2 text-emerald-400 whitespace-nowrap max-w-[180px] truncate">
                        {log.path || '/'}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 max-w-[160px] truncate" title={log.referer}>
                        {log.referer
                          ? log.referer.replace(/^https?:\/\//, '').slice(0, 40)
                          : 'direct'}
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
              {from + 1}–{Math.min(to + 1, totalCount)} / {totalCount.toLocaleString()}건
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
