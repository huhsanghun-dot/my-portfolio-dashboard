import { formatKRW, formatPercent, formatTime } from '../lib/format'

interface Props {
  totalValueKRW: number
  totalCostKRW: number
  fxRate: number
  fxUpdatedAt: number | null
  refreshing: boolean
  onRefresh: () => void
}

export function SummaryCards({ totalValueKRW, totalCostKRW, fxRate, fxUpdatedAt, refreshing, onRefresh }: Props) {
  const pnl = totalValueKRW - totalCostKRW
  const pnlPercent = totalCostKRW > 0 ? (pnl / totalCostKRW) * 100 : 0
  const isUp = pnl >= 0

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">총 자산 가치</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
          >
            {refreshing ? '갱신 중…' : '지금 갱신'}
          </button>
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {formatKRW(totalValueKRW)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <span className="text-sm text-slate-400">평가 손익</span>
        <div className={`mt-1 text-2xl font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isUp ? '+' : ''}
          {formatKRW(pnl)}
        </div>
        <div className={`text-sm ${isUp ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
          {formatPercent(pnlPercent)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <span className="text-sm text-slate-400">환율 (USD/KRW)</span>
        <div className="mt-1 text-2xl font-semibold text-white">₩{fxRate.toFixed(0)}</div>
        <div className="text-xs text-slate-500">업데이트 {formatTime(fxUpdatedAt)}</div>
      </div>
    </div>
  )
}
