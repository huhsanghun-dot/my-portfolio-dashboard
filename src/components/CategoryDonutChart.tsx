import { useMemo, useState } from 'react'
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
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set())

  const allGroups = useMemo(() => {
    const derivedList = deriveAllHoldings(holdings, prices, fxRate)
    return groupByCategory(derivedList).filter((g) => g.subtotalKRW > 0)
  }, [holdings, prices, fxRate])

  // Assigned once per category (not per rendered slice) so a category keeps the same
  // color whether it's shown in the default top-N view or picked out by the filter.
  const colorOf = useMemo(() => {
    const map = new Map<string, string>()
    let i = 0
    for (const g of allGroups) {
      if (g.label === UNCATEGORIZED) {
        map.set(g.label, OTHER_COLOR)
      } else {
        map.set(g.label, PALETTE[i % PALETTE.length])
        i += 1
      }
    }
    return map
  }, [allGroups])

  const filterActive = hiddenLabels.size > 0

  const slices = useMemo<Slice[]>(() => {
    if (filterActive) {
      return allGroups
        .filter((g) => !hiddenLabels.has(g.label))
        .map((g) => ({ name: g.label, value: g.subtotalKRW, color: colorOf.get(g.label) ?? OTHER_COLOR }))
    }

    const named = allGroups.filter((g) => g.label !== UNCATEGORIZED)
    const uncategorized = allGroups.find((g) => g.label === UNCATEGORIZED)

    const top = named.slice(0, MAX_NAMED_SLICES)
    const overflow = named.slice(MAX_NAMED_SLICES)

    const result: Slice[] = top.map((g) => ({ name: g.label, value: g.subtotalKRW, color: colorOf.get(g.label) ?? OTHER_COLOR }))

    if (overflow.length > 0) {
      result.push({ name: '기타', value: overflow.reduce((sum, g) => sum + g.subtotalKRW, 0), color: OTHER_COLOR })
    }
    if (uncategorized) {
      result.push({ name: UNCATEGORIZED, value: uncategorized.subtotalKRW, color: OTHER_COLOR })
    }
    return result
  }, [allGroups, filterActive, hiddenLabels, colorOf])

  const total = slices.reduce((sum, s) => sum + s.value, 0)

  const toggleLabel = (label: string) => {
    setHiddenLabels((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  if (allGroups.length === 0) {
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
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-300">카테고리별 비중</h2>
        {filterActive && (
          <button
            type="button"
            onClick={() => setHiddenLabels(new Set())}
            className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            필터 초기화
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {allGroups.map((g) => {
          const hidden = hiddenLabels.has(g.label)
          const color = colorOf.get(g.label) ?? OTHER_COLOR
          return (
            <button
              key={g.label}
              type="button"
              onClick={() => toggleLabel(g.label)}
              aria-pressed={!hidden}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                hidden ? 'border-slate-800 text-slate-500 hover:border-slate-700' : 'border-slate-700 text-slate-200 hover:border-slate-500'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hidden ? '#475569' : color }} />
              {g.label}
            </button>
          )
        })}
      </div>

      {total <= 0 ? (
        <div className="mt-6 flex h-40 items-center justify-center text-center text-sm text-slate-500">
          선택한 카테고리에 해당하는 자산이 없어요.
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5">
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
              <span className="text-[11px] text-slate-500">{filterActive ? '선택한 자산 합계' : '총 평가금액'}</span>
              <span className="text-base font-semibold leading-tight text-white">{formatKRW(total)}</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
            {slices.map((s) => {
              const pct = (s.value / total) * 100
              return (
                <div key={s.name} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-200">{s.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 text-xs tabular-nums text-slate-500">{formatKRW(s.value)}</div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
