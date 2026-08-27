import { useState } from 'react'
import type { NewHoldingInput } from '../hooks/usePortfolio'
import { todayStr } from '../lib/positions'
import type { AssetType, Currency } from '../types'

interface Props {
  onAdd: (h: NewHoldingInput) => void
  existingCategories: string[]
}

const TYPE_LABEL: Record<AssetType, string> = {
  US_STOCK: '해외 주식',
  CRYPTO: '암호화폐',
  KR_ETF: '국내 ETF',
}

const TYPE_DEFAULT_CURRENCY: Record<AssetType, Currency> = {
  US_STOCK: 'USD',
  CRYPTO: 'USD',
  KR_ETF: 'KRW',
}

const TYPE_SYMBOL_HINT: Record<AssetType, string> = {
  US_STOCK: '예: AAPL, TSLA',
  CRYPTO: '예: BTC_USDT, ETH_USDT',
  KR_ETF: '예: 133690 (KRX 종목코드)',
}

export function HoldingForm({ onAdd, existingCategories }: Props) {
  const [type, setType] = useState<AssetType>('US_STOCK')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [avgBuyPrice, setAvgBuyPrice] = useState('')
  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState('')
  const [open, setOpen] = useState(false)

  const reset = () => {
    setName('')
    setSymbol('')
    setQuantity('')
    setAvgBuyPrice('')
    setDate(todayStr())
    setCategory('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number.parseFloat(quantity)
    const price = Number.parseFloat(avgBuyPrice)
    if (!name.trim() || !symbol.trim() || !Number.isFinite(qty) || !Number.isFinite(price)) return

    onAdd({
      type,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      quantity: qty,
      price,
      date,
      currency: TYPE_DEFAULT_CURRENCY[type],
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
          {(Object.keys(TYPE_LABEL) as AssetType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
        종목명
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: TIGER 나스닥100"
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
          required
        />
      </label>

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

      <label className="flex flex-col gap-1 text-xs text-slate-400 lg:col-span-1">
        매수일
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
