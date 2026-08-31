import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../types'
import { formatDateLabel, formatKRW, formatPercent } from '../lib/format'
import type { CategoryDayChange } from '../lib/portfolioMath'

interface Props {
  snapshots: Snapshot[]
  onReset: () => void
  categoryDayChanges: CategoryDayChange[]
}

type PeriodKey = '1W' | '1M' | '3M' | 'ALL'

const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: '1W', label: '1주', days: 7 },
  { key: '1M', label: '1개월', days: 30 },
  { key: '3M', label: '3개월', days: 90 },
  { key: 'ALL', label: '전체', days: null },
]

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm('지금까지의 자산 변화 기록을 지우고 오늘부터 새로 쌓을까요?')) onReset()
      }}
      className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
    >
      오늘부터 다시 기록
    </button>
  )
}

export function AssetChart({ snapshots, onReset, categoryDayChanges }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('1M')

  const filtered = useMemo(() => {
    const days = PERIODS.find((p) => p.key === period)?.days
    if (days == null || snapshots.length === 0) return snapshots
    const anchor = parseDateStr(snapshots[snapshots.length - 1].date)
    const cutoff = anchor.getTime() - days * 24 * 60 * 60 * 1000
    return snapshots.filter((s) => parseDateStr(s.date).getTime() >= cutoff)
  }, [snapshots, period])

  const stats = useMemo(() => {
    if (filtered.length === 0) return null
    const values = filtered.map((s) => s.totalValueKRW)
    const high = Math.max(...values)
    const low = Math.min(...values)
    const first = values[0]
    const last = values[values.length - 1]
    const returnKRW = last - first
    const returnPercent = first > 0 ? (returnKRW / first) * 100 : null
    return { high, low, returnKRW, returnPercent }
  }, [filtered])

  // Always yesterday-vs-today, regardless of which period tab is selected.
  const dayChange = useMemo(() => {
    if (snapshots.length < 2) return null
    const prev = snapshots[snapshots.length - 2].totalValueKRW
    const last = snapshots[snapshots.length - 1].totalValueKRW
    const changeKRW = last - prev
    const changePercent = prev > 0 ? (changeKRW / prev) * 100 : null
    return { changeKRW, changePercent }
  }, [snapshots])

  const periodTabs = (
    <div className="flex shrink-0 gap-1 rounded-lg border border-slate-800 p-0.5 text-xs">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => setPeriod(p.key)}
          className={`rounded-md px-2 py-1 transition ${
            period === p.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )

  if (snapshots.length < 2) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">자산 변화 추이</h2>
          {snapshots.length > 0 && <ResetButton onReset={onReset} />}
        </div>
        <div className="mt-4 flex flex-1 min-h-[160px] items-center justify-center text-center text-sm text-slate-500">
          매일 접속하면 그날의 총 자산이 자동 기록되어 이 그래프에 쌓입니다.
        </div>
      </div>
    )
  }

  const data = filtered.map((s) => ({ date: s.date, label: formatDateLabel(s.date), value: s.totalValueKRW }))
  const isUp = (stats?.returnKRW ?? 0) >= 0

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-medium text-slate-300">자산 변화 추이</h2>
        <div className="flex flex-wrap items-center gap-2">
          {periodTabs}
          <ResetButton onReset={onReset} />
        </div>
      </div>

      {data.length < 2 || !stats ? (
        <div className="mt-4 flex flex-1 min-h-[160px] items-center justify-center text-center text-sm text-slate-500">
          선택한 기간에는 기록이 부족해요. 다른 기간을 선택해보세요.
        </div>
      ) : (
        <>
          <div className="mt-2.5 min-h-[140px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="assetFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v: number) => `${Math.round(v / 10000).toLocaleString()}만`}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#cbd5e1' }}
                  formatter={(value) => [formatKRW(Number(value)), '총 자산']}
                />
                <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="url(#assetFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2 sm:p-2.5">
              <div className="text-[11px] text-slate-500">기간 최고</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-white sm:text-base">
                {formatKRW(stats.high)}
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2 sm:p-2.5">
              <div className="text-[11px] text-slate-500">기간 최저</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-white sm:text-base">
                {formatKRW(stats.low)}
              </div>
            </div>
            <div className="col-span-2 min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-2 sm:col-span-1 sm:p-2.5">
              <div className="text-[11px] text-slate-500">기간 수익률</div>
              <div className={`mt-0.5 text-sm font-semibold tabular-nums sm:text-base ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}
                {formatKRW(stats.returnKRW)}
              </div>
              {stats.returnPercent != null && (
                <div className={`text-[11px] tabular-nums ${isUp ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                  {formatPercent(stats.returnPercent)}
                </div>
              )}
            </div>
          </div>

          {dayChange && (
            <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">전일 대비</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${dayChange.changeKRW >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {dayChange.changeKRW >= 0 ? '+' : ''}
                  {formatKRW(dayChange.changeKRW)}
                  {dayChange.changePercent != null && (
                    <span className="ml-1.5 text-xs opacity-80">{formatPercent(dayChange.changePercent)}</span>
                  )}
                </span>
              </div>

              {categoryDayChanges.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-slate-800 pt-2.5">
                  {categoryDayChanges.slice(0, 6).map((c) => {
                    const up = c.changeKRW >= 0
                    return (
                      <div key={c.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-slate-400">{c.label}</span>
                        <span className={`shrink-0 tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {up ? '+' : ''}
                          {formatKRW(c.changeKRW)}
                          {c.changePercent != null && <span className="ml-1 opacity-80">{formatPercent(c.changePercent)}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
