import { useState } from 'react'
import type { Holding, Transaction, TransactionAction } from '../types'
import { computePosition, todayStr } from '../lib/positions'
import { formatKRW, formatNumber, formatUSD } from '../lib/format'
import type { NewTransactionInput } from '../hooks/usePortfolio'

interface Props {
  holding: Holding
  transactions: Transaction[]
  onAdd: (holdingId: string, input: NewTransactionInput) => string | null
  onRemove: (transactionId: string) => void
  onClose: () => void
}

const ACTION_LABEL: Record<TransactionAction, string> = { BUY: '매수', SELL: '매도' }

function formatNative(value: number, currency: Holding['currency']) {
  return currency === 'USD' ? formatUSD(value) : formatKRW(value)
}

export function TransactionModal({ holding, transactions, onAdd, onRemove, onClose }: Props) {
  const [action, setAction] = useState<TransactionAction>('BUY')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(todayStr())
  const [error, setError] = useState<string | null>(null)

  const position = computePosition(transactions)
  const sortedDesc = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number.parseFloat(quantity)
    const p = Number.parseFloat(price)
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(p) || p < 0) {
      setError('수량과 가격을 확인해주세요.')
      return
    }
    const err = onAdd(holding.id, { action, quantity: qty, price: p, date })
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setQuantity('')
    setPrice('')
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-slate-800 bg-slate-900 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-white">{holding.name} 매매 내역</h2>
            <p className="text-xs text-slate-500">{holding.symbol}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-slate-800 px-4 py-3 text-center text-sm">
          <div>
            <div className="text-xs text-slate-500">보유 수량</div>
            <div className="text-white">{formatNumber(position.quantity)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">평균 매입가</div>
            <div className="text-white">{position.quantity > 0 ? formatNative(position.avgBuyPrice, holding.currency) : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">실현손익</div>
            <div className={position.realizedPnl > 0 ? 'text-emerald-400' : position.realizedPnl < 0 ? 'text-rose-400' : 'text-slate-300'}>
              {position.realizedPnl !== 0 ? formatNative(position.realizedPnl, holding.currency) : '-'}
            </div>
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as TransactionAction)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
            >
              <option value="BUY">매수</option>
              <option value="SELL">매도</option>
            </select>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              step="any"
              placeholder="수량"
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
              required
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="any"
              placeholder={`단가 (${holding.currency})`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
              required
            />
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
              required
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            className="self-start rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            거래 추가
          </button>
        </form>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {sortedDesc.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">거래 내역이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 py-2">
              {sortedDesc.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        t.action === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {ACTION_LABEL[t.action]}
                    </span>
                    <span className="text-slate-400">{t.date}</span>
                    <span className="truncate text-slate-200">
                      {formatNumber(t.quantity)} @ {formatNative(t.price, holding.currency)}
                    </span>
                  </div>
                  <button type="button" onClick={() => onRemove(t.id)} className="shrink-0 text-xs text-slate-500 hover:text-rose-400">
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
