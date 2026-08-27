import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../types'
import { formatDateLabel, formatKRW } from '../lib/format'

interface Props {
  snapshots: Snapshot[]
}

export function AssetChart({ snapshots }: Props) {
  if (snapshots.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-medium text-slate-300">자산 변화 추이</h2>
        <div className="mt-6 flex h-48 items-center justify-center text-sm text-slate-500">
          매일 접속하면 그날의 총 자산이 자동 기록되어 이 그래프에 쌓입니다.
        </div>
      </div>
    )
  }

  const data = snapshots.map((s) => ({ date: s.date, label: formatDateLabel(s.date), value: s.totalValueKRW }))

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-medium text-slate-300">자산 변화 추이</h2>
      <div className="mt-2 h-56 sm:h-72">
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
    </div>
  )
}
