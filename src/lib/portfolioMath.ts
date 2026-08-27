import { effectivePrice } from '../hooks/usePortfolio'
import type { Holding, PriceInfo } from '../types'

export const UNCATEGORIZED = '미분류'

export interface DerivedHolding {
  h: Holding
  info: PriceInfo | undefined
  price: number | null
  currentValueKRW: number | null
  pnlKRW: number | null
  pnlPercent: number | null
}

export interface CategoryGroup {
  label: string
  items: DerivedHolding[]
  subtotalKRW: number
}

export function deriveHoldingMetrics(h: Holding, info: PriceInfo | undefined, fxRate: number): DerivedHolding {
  const price = effectivePrice(h, info)
  const currentValueNative = price != null ? price * h.quantity : null
  const costNative = h.avgBuyPrice * h.quantity
  const currentValueKRW =
    currentValueNative != null ? (h.currency === 'USD' ? currentValueNative * fxRate : currentValueNative) : null
  const costKRW = h.currency === 'USD' ? costNative * fxRate : costNative
  const pnlKRW = currentValueKRW != null ? currentValueKRW - costKRW : null
  const pnlPercent = pnlKRW != null && costKRW > 0 ? (pnlKRW / costKRW) * 100 : null
  return { h, info, price, currentValueKRW, pnlKRW, pnlPercent }
}

export function deriveAllHoldings(holdings: Holding[], prices: Record<string, PriceInfo>, fxRate: number): DerivedHolding[] {
  return holdings.map((h) => deriveHoldingMetrics(h, prices[h.id], fxRate))
}

/** Groups derived holdings by their user-defined category (falling back to "미분류"), sorted by subtotal value descending — 미분류 always last. */
export function groupByCategory(derivedList: DerivedHolding[]): CategoryGroup[] {
  const map = new Map<string, DerivedHolding[]>()
  for (const d of derivedList) {
    const key = d.h.category?.trim() || UNCATEGORIZED
    const list = map.get(key)
    if (list) list.push(d)
    else map.set(key, [d])
  }
  const entries: CategoryGroup[] = [...map.entries()].map(([label, items]) => ({
    label,
    items,
    subtotalKRW: items.reduce((sum, d) => sum + (d.currentValueKRW ?? 0), 0),
  }))
  entries.sort((a, b) => {
    if (a.label === UNCATEGORIZED) return 1
    if (b.label === UNCATEGORIZED) return -1
    return b.subtotalKRW - a.subtotalKRW
  })
  return entries
}
