/**
 * app/admin/dashboard-charts.tsx  ('use client')
 *
 * 어드민 대시보드의 차트 영역.
 * recharts 라이브러리를 사용하며, 'use client' 가 필요하다.
 *
 * [차트 구성]
 * 1. 7일 일별 매출 라인차트 (LineChart)
 *    - 데이터: admin/page.tsx 에서 집계된 DailyRevenue[]
 *    - Y축: 만/천 단위 약자 표기 (shortRevenue 함수)
 * 2. 카테고리별 매출 도넛 파이차트 (PieChart)
 *    - 데이터: admin/page.tsx 에서 order_items + categories join 후 집계한 CategoryRevenue[]
 *    - 중앙에 총 매출 텍스트 표시
 *
 * [props]
 * dailyRevenue, categoryRevenue 는 서버에서 집계해 전달 (클라이언트에서 DB 조회 없음)
 */

'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export interface DailyRevenue {
  date: string
  revenue: number
}

export interface CategoryRevenue {
  name: string
  value: number
}

interface Props {
  dailyRevenue: DailyRevenue[]
  categoryRevenue: CategoryRevenue[]
}

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6']

function shortRevenue(value: number) {
  if (value >= 10000) return `${Math.round(value / 10000)}만`
  if (value >= 1000) return `${Math.round(value / 1000)}천`
  return String(value)
}

export default function DashboardCharts({ dailyRevenue, categoryRevenue }: Props) {
  const totalCatRevenue = categoryRevenue.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">

      {/* 7일 일별 매출 라인차트 */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">최근 7일 매출</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={shortRevenue}
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value) => [`${Number(value ?? 0).toLocaleString('ko-KR')}원`, '매출']}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: '#18181b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              cursor={{ stroke: '#e4e4e7' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 카테고리별 매출 파이차트 */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">카테고리별 매출</h2>
        {categoryRevenue.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-zinc-400">데이터 없음</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryRevenue}
                cx="50%"
                cy="44%"
                innerRadius={48}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryRevenue.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              {/* 도넛 중앙 총 매출 텍스트 */}
              <text x="50%" y="40%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.6em" fontSize="11" fill="#a1a1aa">총 매출</tspan>
                <tspan x="50%" dy="1.5em" fontSize="13" fontWeight="700" fill="#18181b">
                  {shortRevenue(totalCatRevenue)}원
                </tspan>
              </text>
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0).toLocaleString('ko-KR')}원`, '매출']}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  backgroundColor: '#ffffff',
                  color: '#18181b',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                formatter={(value, entry: any) => (
                  <span style={{ fontSize: 11, color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
