import { useMemo, useState } from 'react'
import type { NewTransactionInput } from '../hooks/usePortfolio'
import { ASSET_TYPE_LABEL } from '../lib/assetTypes'
import { formatKRW, formatNumber, formatPercent, formatUSD } from '../lib/format'
import { deriveAllHoldings, groupByCategory, type DerivedHolding } from '../lib/portfolioMath'
import { transactionsFor } from '../lib/positions'
import type { Holding, HoldingIdentity, PriceInfo, Transaction } from '../types'
import { TransactionModal } from './TransactionModal'

interface Props {
  holdings: Holding[]
  prices: Record<string, PriceInfo>
  fxRate: number
  transactions: Transaction[]
  onUpdate: (id: string, patch: Partial<HoldingIdentity>) => void
  onRemove: (id: string) => void
  onAddTransaction: (holdingId: string, input: NewTransactionInput) => string | null
  onRemoveTransaction: (transactionId: string) => void
}

function formatNative(value: number, currency: Holding['currency']) {
  return currency === 'USD' ? formatUSD(value) : formatKRW(value)
}

function GroupPnl({ pnlKRW, pnlPercent }: { pnlKRW: number | null; pnlPercent: number | null }) {
  if (pnlKRW == null) return null
  const isUp = pnlKRW >= 0
  return (
    <div className={`flex items-baseline gap-1 text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
      <span>
        {isUp ? '+' : ''}
        {formatKRW(pnlKRW)}
      </span>
      {pnlPercent != null && <span className="opacity-80">{formatPercent(pnlPercent)}</span>}
    </div>
  )
}

export function HoldingsList({
  holdings,
  prices,
  fxRate,
  transactions,
  onUpdate,
  onRemove,
  onAddTransaction,
  onRemoveTransaction,
}: Props) {
  const [grouped, setGrouped] = useState(true)
  const [openTxnHoldingId, setOpenTxnHoldingId] = useState<string | null>(null)

  const derivedList = useMemo(() => deriveAllHoldings(holdings, prices, fxRate), [holdings, prices, fxRate])
  const grandTotalKRW = derivedList.reduce((sum, d) => sum + (d.currentValueKRW ?? 0), 0)
  const groups = useMemo(() => groupByCategory(derivedList), [derivedList])
  const openTxnHolding = openTxnHoldingId != null ? holdings.find((h) => h.id === openTxnHoldingId) : undefined

  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
        아직 등록된 자산이 없습니다. 위에서 자산을 추가해보세요.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <span className="text-sm font-medium text-slate-300">보유 자산</span>
        <div className="flex gap-1 rounded-lg border border-slate-800 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setGrouped(false)}
            className={`rounded-md px-2.5 py-1 transition ${!grouped ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setGrouped(true)}
            className={`rounded-md px-2.5 py-1 transition ${grouped ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            카테고리별
          </button>
        </div>
      </div>

      {/* Desktop / tablet-landscape table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">종목</th>
              <th className="px-4 py-3 font-medium">수량</th>
              <th className="px-4 py-3 font-medium">현재가</th>
              <th className="px-4 py-3 font-medium">매입가</th>
              <th className="px-4 py-3 font-medium">평가금액(KRW)</th>
              <th className="px-4 py-3 font-medium">손익</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          {grouped ? (
            groups.map((g, i) => (
              <tbody key={g.label}>
                <tr className={`border-b border-slate-800 bg-slate-800/40 ${i > 0 ? 'border-t-2 border-t-slate-700' : ''}`}>
                  <td colSpan={7} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-l-4 border-indigo-500/70 pl-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold tracking-tight text-white">{g.label}</span>
                        <span className="text-xs text-slate-500">{g.items.length}개 종목</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-slate-200">{formatKRW(g.subtotalKRW)}</span>
                          {grandTotalKRW > 0 && (
                            <span className="text-xs text-slate-500">
                              {((g.subtotalKRW / grandTotalKRW) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <GroupPnl pnlKRW={g.pnlKRW} pnlPercent={g.pnlPercent} />
                      </div>
                    </div>
                  </td>
                </tr>
                {g.items.map((d) => (
                  <HoldingRow key={d.h.id} d={d} onUpdate={onUpdate} onRemove={onRemove} onOpenTransactions={setOpenTxnHoldingId} variant="row" />
                ))}
              </tbody>
            ))
          ) : (
            <tbody>
              {derivedList.map((d) => (
                <HoldingRow key={d.h.id} d={d} onUpdate={onUpdate} onRemove={onRemove} onOpenTransactions={setOpenTxnHoldingId} variant="row" />
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Mobile / tablet-portrait card list */}
      <div className="flex flex-col gap-4 p-3 lg:hidden">
        {grouped
          ? groups.map((g, i) => (
              <div key={g.label} className={`flex flex-col gap-2 ${i > 0 ? 'mt-2 border-t border-slate-800 pt-5' : ''}`}>
                <div className="flex items-start justify-between gap-2 rounded-lg bg-slate-800/40 py-2 pl-3 pr-2.5">
                  <div className="flex items-baseline gap-2 border-l-4 border-indigo-500/70 pl-2.5">
                    <span className="text-base font-bold tracking-tight text-white">{g.label}</span>
                    <span className="text-xs text-slate-500">{g.items.length}개</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-slate-200">{formatKRW(g.subtotalKRW)}</span>
                      {grandTotalKRW > 0 && (
                        <span className="text-xs text-slate-500">
                          {((g.subtotalKRW / grandTotalKRW) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <GroupPnl pnlKRW={g.pnlKRW} pnlPercent={g.pnlPercent} />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {g.items.map((d) => (
                    <HoldingRow key={d.h.id} d={d} onUpdate={onUpdate} onRemove={onRemove} onOpenTransactions={setOpenTxnHoldingId} variant="card" />
                  ))}
                </div>
              </div>
            ))
          : derivedList.map((d) => <HoldingRow key={d.h.id} d={d} onUpdate={onUpdate} onRemove={onRemove} onOpenTransactions={setOpenTxnHoldingId} variant="card" />)}
      </div>

      {openTxnHolding && (
        <TransactionModal
          holding={openTxnHolding}
          transactions={transactionsFor(transactions, openTxnHolding.id)}
          onAdd={onAddTransaction}
          onRemove={onRemoveTransaction}
          onClose={() => setOpenTxnHoldingId(null)}
        />
      )}
    </div>
  )
}

function HoldingRow({
  d,
  onUpdate,
  onRemove,
  onOpenTransactions,
  variant,
}: {
  d: DerivedHolding
  onUpdate: (id: string, patch: Partial<HoldingIdentity>) => void
  onRemove: (id: string) => void
  onOpenTransactions: (id: string) => void
  variant: 'row' | 'card'
}) {
  const { h, info, price, currentValueKRW, pnlKRW, pnlPercent } = d
  const isUp = (pnlKRW ?? 0) >= 0
  const usedManual = info?.price == null && h.manualPrice != null
  const isCash = h.type === 'CASH'

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

  const categoryInput = (
    <input
      type="text"
      value={h.category ?? ''}
      onChange={(e) => onUpdate(h.id, { category: e.target.value === '' ? undefined : e.target.value })}
      placeholder="카테고리 지정"
      className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white placeholder:text-slate-600"
    />
  )

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{ASSET_TYPE_LABEL[h.type]}</span>
              <span className="font-medium text-white">{h.name}</span>
            </div>
            <div className="text-xs text-slate-500">
              {isCash ? h.currency : `${h.symbol} · ${formatNumber(h.quantity)}주/개`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => onOpenTransactions(h.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
              거래내역
            </button>
            <button type="button" onClick={() => onRemove(h.id)} className="text-xs text-slate-500 hover:text-rose-400">
              삭제
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {isCash ? (
            <div className="col-span-2">
              <div className="text-xs text-slate-500">보유 금액</div>
              <div className="text-white">{formatNative(h.quantity, h.currency)}</div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-slate-500">매입가</div>
              <div className="text-slate-300">{formatNative(h.avgBuyPrice, h.currency)}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-slate-500">평가금액</div>
            <div className="text-white">{currentValueKRW != null ? formatKRW(currentValueKRW) : '-'}</div>
          </div>
          {!isCash && (
            <div>
              <div className="text-xs text-slate-500">현재가</div>
              <div className="text-white">
                {price != null ? formatNative(price, h.currency) : info?.error ?? '조회 중…'}
                {usedManual && <span className="ml-1 text-[10px] text-amber-400">수동</span>}
              </div>
            </div>
          )}
          {!isCash && (
            <div>
              <div className="text-xs text-slate-500">손익</div>
              <div className={pnlKRW == null ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-rose-400'}>
                {pnlKRW != null ? `${isUp ? '+' : ''}${formatKRW(pnlKRW)}` : '-'}
                {pnlPercent != null && <span className="ml-1 text-xs">{formatPercent(pnlPercent)}</span>}
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">카테고리</span>
            {categoryInput}
          </div>
          {!isCash && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">수동 시세</span>
              {manualInput}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <tr className="border-b border-slate-800/60 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{ASSET_TYPE_LABEL[h.type]}</span>
          <div>
            <div className="font-medium text-white">{h.name}</div>
            <div className="text-xs text-slate-500">{isCash ? h.currency : h.symbol}</div>
          </div>
        </div>
        <div className="mt-1">{categoryInput}</div>
      </td>
      <td className="px-4 py-3 text-slate-300">{formatNumber(h.quantity)}</td>
      <td className="px-4 py-3">
        {isCash ? (
          <span className="text-slate-500">-</span>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-white">
                {price != null ? formatNative(price, h.currency) : <span className="text-rose-400/80 text-xs">{info?.error ?? '조회 중…'}</span>}
              </span>
              {usedManual && <span className="text-[10px] text-amber-400">수동</span>}
            </div>
            <div className="mt-1">{manualInput}</div>
          </>
        )}
      </td>
      <td className="px-4 py-3 text-slate-300">{isCash ? '-' : formatNative(h.avgBuyPrice, h.currency)}</td>
      <td className="px-4 py-3 text-white">{currentValueKRW != null ? formatKRW(currentValueKRW) : '-'}</td>
      <td className={`px-4 py-3 ${pnlKRW == null ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isCash ? '-' : pnlKRW != null ? `${isUp ? '+' : ''}${formatKRW(pnlKRW)}` : '-'}
        {!isCash && pnlPercent != null && <div className="text-xs opacity-80">{formatPercent(pnlPercent)}</div>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenTransactions(h.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
            거래내역
          </button>
          <button type="button" onClick={() => onRemove(h.id)} className="text-xs text-slate-500 hover:text-rose-400">
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}
