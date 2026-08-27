import type { Holding, PriceInfo } from '../types'
import { effectivePrice } from '../hooks/usePortfolio'
import { formatKRW, formatNumber, formatPercent, formatUSD } from '../lib/format'

interface Props {
  holdings: Holding[]
  prices: Record<string, PriceInfo>
  fxRate: number
  onUpdate: (id: string, patch: Partial<Holding>) => void
  onRemove: (id: string) => void
}

const TYPE_LABEL: Record<Holding['type'], string> = {
  US_STOCK: '해외주식',
  CRYPTO: '암호화폐',
  KR_ETF: '국내ETF',
}

function useDerived(h: Holding, info: PriceInfo | undefined, fxRate: number) {
  const price = effectivePrice(h, info)
  const currentValueNative = price != null ? price * h.quantity : null
  const costNative = h.avgBuyPrice * h.quantity
  const currentValueKRW = currentValueNative != null ? (h.currency === 'USD' ? currentValueNative * fxRate : currentValueNative) : null
  const costKRW = h.currency === 'USD' ? costNative * fxRate : costNative
  const pnlKRW = currentValueKRW != null ? currentValueKRW - costKRW : null
  const pnlPercent = pnlKRW != null && costKRW > 0 ? (pnlKRW / costKRW) * 100 : null
  return { price, currentValueKRW, pnlKRW, pnlPercent }
}

function formatNative(value: number, currency: Holding['currency']) {
  return currency === 'USD' ? formatUSD(value) : formatKRW(value)
}

export function HoldingsList({ holdings, prices, fxRate, onUpdate, onRemove }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
        아직 등록된 자산이 없습니다. 위에서 자산을 추가해보세요.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
      {/* Desktop / tablet-landscape table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">종목</th>
              <th className="px-4 py-3 font-medium">수량</th>
              <th className="px-4 py-3 font-medium">매입가</th>
              <th className="px-4 py-3 font-medium">현재가</th>
              <th className="px-4 py-3 font-medium">평가금액(KRW)</th>
              <th className="px-4 py-3 font-medium">손익</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <HoldingRow
                key={h.id}
                h={h}
                info={prices[h.id]}
                fxRate={fxRate}
                onUpdate={onUpdate}
                onRemove={onRemove}
                variant="row"
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet-portrait card list */}
      <div className="flex flex-col gap-3 p-3 lg:hidden">
        {holdings.map((h) => (
          <HoldingRow key={h.id} h={h} info={prices[h.id]} fxRate={fxRate} onUpdate={onUpdate} onRemove={onRemove} variant="card" />
        ))}
      </div>
    </div>
  )
}

function HoldingRow({
  h,
  info,
  fxRate,
  onUpdate,
  onRemove,
  variant,
}: {
  h: Holding
  info: PriceInfo | undefined
  fxRate: number
  onUpdate: (id: string, patch: Partial<Holding>) => void
  onRemove: (id: string) => void
  variant: 'row' | 'card'
}) {
  const { price, currentValueKRW, pnlKRW, pnlPercent } = useDerived(h, info, fxRate)
  const isUp = (pnlKRW ?? 0) >= 0
  const usedManual = info?.price == null && h.manualPrice != null

  const manualInput = (
    <input
      type="number"
      step="any"
      value={h.manualPrice ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onUpdate(h.id, { manualPrice: v === '' ? undefined : Number.parseFloat(v) })
      }}
      placeholder="수동 입력"
      className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white placeholder:text-slate-600"
    />
  )

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{TYPE_LABEL[h.type]}</span>
              <span className="font-medium text-white">{h.name}</span>
            </div>
            <div className="text-xs text-slate-500">
              {h.symbol} · {formatNumber(h.quantity)}주/개
            </div>
          </div>
          <button type="button" onClick={() => onRemove(h.id)} className="text-xs text-slate-500 hover:text-rose-400">
            삭제
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-slate-500">현재가</div>
            <div className="text-white">
              {price != null ? formatNative(price, h.currency) : info?.error ?? '조회 중…'}
              {usedManual && <span className="ml-1 text-[10px] text-amber-400">수동</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">평가금액</div>
            <div className="text-white">{currentValueKRW != null ? formatKRW(currentValueKRW) : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">매입가</div>
            <div className="text-slate-300">{formatNative(h.avgBuyPrice, h.currency)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">손익</div>
            <div className={pnlKRW == null ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-rose-400'}>
              {pnlKRW != null ? `${isUp ? '+' : ''}${formatKRW(pnlKRW)}` : '-'}
              {pnlPercent != null && <span className="ml-1 text-xs">{formatPercent(pnlPercent)}</span>}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
          <span className="text-[11px] text-slate-500">수동 시세 (조회 실패 시 대체)</span>
          {manualInput}
        </div>
      </div>
    )
  }

  return (
    <tr className="border-b border-slate-800/60 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{TYPE_LABEL[h.type]}</span>
          <div>
            <div className="font-medium text-white">{h.name}</div>
            <div className="text-xs text-slate-500">{h.symbol}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300">{formatNumber(h.quantity)}</td>
      <td className="px-4 py-3 text-slate-300">{formatNative(h.avgBuyPrice, h.currency)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-white">
            {price != null ? formatNative(price, h.currency) : <span className="text-rose-400/80 text-xs">{info?.error ?? '조회 중…'}</span>}
          </span>
          {usedManual && <span className="text-[10px] text-amber-400">수동</span>}
        </div>
        <div className="mt-1">{manualInput}</div>
      </td>
      <td className="px-4 py-3 text-white">{currentValueKRW != null ? formatKRW(currentValueKRW) : '-'}</td>
      <td className={`px-4 py-3 ${pnlKRW == null ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        {pnlKRW != null ? `${isUp ? '+' : ''}${formatKRW(pnlKRW)}` : '-'}
        {pnlPercent != null && <div className="text-xs opacity-80">{formatPercent(pnlPercent)}</div>}
      </td>
      <td className="px-4 py-3 text-right">
        <button type="button" onClick={() => onRemove(h.id)} className="text-xs text-slate-500 hover:text-rose-400">
          삭제
        </button>
      </td>
    </tr>
  )
}
