import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Holding, PriceInfo } from '../types'
import { formatKRW } from '../lib/format'
import { deriveAllHoldings, groupByCategory, UNCATEGORIZED } from '../lib/portfolioMath'

interface Props {
  holdings: Holding[]
  prices: Record<string, PriceInfo>
  fxRate: number
}

// Validated dark-mode categorical palette (see dataviz skill) — fixed order, never cycled per-render.
const PALETTE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const OTHER_COLOR = '#64748b' // slate-500 — muted, reserved for the non-identity "기타"/"미분류" buckets
const MAX_NAMED_SLICES = 7

interface Slice {
  name: string
  value: number
  color: string
}

export function CategoryDonutChart({ holdings, prices, fxRate }: Props) {
  const slices = useMemo<Slice[]>(() => {
    const derivedList = deriveAllHoldings(holdings, prices, fxRate)
    const groups = groupByCategory(derivedList).filter((g) => g.subtotalKRW > 0)

    const named = groups.filter((g) => g.label !== UNCATEGORIZED)
    const uncategorized = groups.find((g) => g.label === UNCATEGORIZED)

    const top = named.slice(0, MAX_NAMED_SLICES)
    const overflow = named.slice(MAX_NAMED_SLICES)

    const result: Slice[] = top.map((g, i) => ({ name: g.label, value: g.subtotalKRW, color: PALETTE[i % PALETTE.length] }))

    if (overflow.length > 0) {
      result.push({ name: '기타', value: overflow.reduce((sum, g) => sum + g.subtotalKRW, 0), color: OTHER_COLOR })
    }
    if (uncategorized) {
      result.push({ name: UNCATEGORIZED, value: uncategorized.subtotalKRW, color: OTHER_COLOR })
    }
    return result
  }, [holdings, prices, fxRate])

  const total = slices.reduce((sum, s) => sum + s.value, 0)

  if (total <= 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-medium text-slate-300">카테고리별 비중</h2>
        <div className="mt-6 flex h-48 items-center justify-center text-sm text-slate-500">
          시세가 반영된 자산이 있으면 비중이 여기 표시됩니다.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-medium text-slate-300">카테고리별 비중</h2>
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative h-52 w-52 shrink-0 sm:h-56 sm:w-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="64%"
                outerRadius="88%"
                paddingAngle={3}
                cornerRadius={5}
                stroke="none"
                isAnimationActive={false}
                label={({ percent }) =>
                  (percent ?? 0) >= 0.08 ? `${Math.round((percent ?? 0) * 100)}%` : ''
                }
                labelLine={false}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 500 }}
                itemStyle={{ color: '#cbd5e1' }}
                formatter={(value, name) => [`${formatKRW(Number(value))} (${((Number(value) / total) * 100).toFixed(1)}%)`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[11px] text-slate-500">총 평가금액</span>
            <span className="text-base font-semibold leading-tight text-white">{formatKRW(total)}</span>
          </div>
        </div>

        <ul className="flex w-full min-w-0 flex-col gap-2 text-sm">
          {slices.map((s) => (
            <li key={s.name} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate text-slate-300" title={s.name}>
                {s.name}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">{formatKRW(s.value)}</span>
              <span className="w-12 shrink-0 text-right tabular-nums font-medium text-slate-300">
                {((s.value / total) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
