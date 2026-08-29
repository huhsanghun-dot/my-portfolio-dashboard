import { useState } from 'react'
import type { NewHoldingInput } from '../hooks/usePortfolio'
import { ASSET_TYPE_LABEL, ASSET_TYPE_ORDER } from '../lib/assetTypes'
import { todayStr } from '../lib/positions'
import type { AssetType, Currency } from '../types'

interface Props {
  onAdd: (h: NewHoldingInput) => void
  existingCategories: string[]
}

const TYPE_DEFAULT_CURRENCY: Partial<Record<AssetType, Currency>> = {
  US_STOCK: 'USD',
  KR_ETF: 'KRW',
  CRYPTO: 'KRW',
}

const TYPE_SYMBOL_HINT: Partial<Record<AssetType, string>> = {
  US_STOCK: '예: AAPL, TSLA',
  CRYPTO: '예: KRW-BTC, KRW-ETH (업비트 마켓 코드)',
  KR_ETF: '예: 133690 (KRX 종목코드)',
}

export function HoldingForm({ onAdd, existingCategories }: Props) {
  const [type, setType] = useState<AssetType>('US_STOCK')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [avgBuyPrice, setAvgBuyPrice] = useState('')
  const [cashCurrency, setCashCurrency] = useState<Currency>('KRW')
  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState('')
  const [open, setOpen] = useState(false)

  const isCash = type === 'CASH'

  const reset = () => {
    setName('')
    setSymbol('')
    setQuantity('')
    setAvgBuyPrice('')
    setCashCurrency('KRW')
    setDate(todayStr())
    setCategory('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (isCash) {
      const amount = Number.parseFloat(quantity)
      if (!Number.isFinite(amount) || amount <= 0) return
      onAdd({
        type,
        name: name.trim(),
        symbol: cashCurrency,
        quantity: amount,
        price: 1,
        date,
        currency: cashCurrency,
        category: category.trim() || undefined,
      })
      reset()
      setOpen(false)
      return
    }

    const qty = Number.parseFloat(quantity)
    const price = Number.parseFloat(avgBuyPrice)
    if (!symbol.trim() || !Number.isFinite(qty) || !Number.isFinite(price)) return

    onAdd({
      type,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      quantity: qty,
      price,
      date,
      currency: TYPE_DEFAULT_CURRENCY[type] ?? 'KRW',
      category: category.trim() || undefined,
    })
    reset()
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-slate-700 py-3 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
      >
        + 자산 추가
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-3 lg:grid-cols-7"
    >
      <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
        구분
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AssetType)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
        >
          {ASSET_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
        {isCash ? '설명' : '종목명'}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isCash ? '예: 비상금, 달러 예금' : '예: TIGER 나스닥100'}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
          required
        />
      </label>

      {isCash ? (
        <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
          통화
          <select
            value={cashCurrency}
            onChange={(e) => setCashCurrency(e.target.value as Currency)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
          >
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
          심볼/코드
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder={TYPE_SYMBOL_HINT[type]}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
            required
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
        카테고리 (선택)
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="예: QQQ"
          list="category-suggestions"
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
        />
        <datalist id="category-suggestions">
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      {isCash ? (
        <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
          금액 ({cashCurrency})
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            step="any"
            placeholder="0"
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
            required
          />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
            매수 수량
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              step="any"
              placeholder="0"
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
            매수가 ({TYPE_DEFAULT_CURRENCY[type]})
            <input
              value={avgBuyPrice}
              onChange={(e) => setAvgBuyPrice(e.target.value)}
              type="number"
              step="any"
              placeholder="0"
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
              required
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
        {isCash ? '입금일' : '매수일'}
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
          required
        />
      </label>

      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-7">
        <button
          type="submit"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          추가
        </button>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          취소
        </button>
      </div>
    </form>
  )
}
