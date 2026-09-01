import { effectivePrice } from '../hooks/usePortfolio'
import { ASSET_TYPE_LABEL, ASSET_TYPE_ORDER } from './assetTypes'
import type { Holding, PriceInfo } from '../types'

/** Fallback label of last resort — practically unreachable since every holding has a type. */
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
  pnlKRW: number | null
  pnlPercent: number | null
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

/**
 * Groups derived holdings by their user-defined category, falling back to the
 * holding's asset-type label (해외주식/국내주식/암호화폐/현금자산) when no category was
 * set — so holdings nobody bothered to categorize still land in a meaningful
 * group instead of one big "미분류" bucket.
 *
 * Custom (user-named) groups come first, sorted by subtotal value descending;
 * the asset-type fallback groups follow in the fixed order 해외주식 - 국내주식 -
 * 가상화폐 - 현금자산. Within every group, items are sorted by current value
 * descending.
 */
export function groupByCategory(derivedList: DerivedHolding[]): CategoryGroup[] {
  const map = new Map<string, DerivedHolding[]>()
  const customLabels = new Set<string>()

  for (const d of derivedList) {
    const custom = d.h.category?.trim()
    const key = custom || ASSET_TYPE_LABEL[d.h.type] || UNCATEGORIZED
    if (custom) customLabels.add(key)
    const list = map.get(key)
    if (list) list.push(d)
    else map.set(key, [d])
  }

  const entries: CategoryGroup[] = [...map.entries()].map(([label, items]) => {
    // Only holdings with both a known value and P&L contribute to the group's
    // P&L, so a holding whose price failed to load doesn't skew the group total.
    const pnlItems = items.filter((d) => d.pnlKRW != null && d.currentValueKRW != null)
    const pnlKRW = pnlItems.length > 0 ? pnlItems.reduce((sum, d) => sum + (d.pnlKRW ?? 0), 0) : null
    const costKRW = pnlItems.reduce((sum, d) => sum + ((d.currentValueKRW ?? 0) - (d.pnlKRW ?? 0)), 0)
    const pnlPercent = pnlKRW != null && costKRW > 0 ? (pnlKRW / costKRW) * 100 : null

    return {
      label,
      items: [...items].sort((a, b) => (b.currentValueKRW ?? 0) - (a.currentValueKRW ?? 0)),
      subtotalKRW: items.reduce((sum, d) => sum + (d.currentValueKRW ?? 0), 0),
      pnlKRW,
      pnlPercent,
    }
  })

  const typeRank = (label: string) => {
    const idx = ASSET_TYPE_ORDER.findIndex((t) => ASSET_TYPE_LABEL[t] === label)
    return idx === -1 ? ASSET_TYPE_ORDER.length : idx
  }

  entries.sort((a, b) => {
    const aCustom = customLabels.has(a.label)
    const bCustom = customLabels.has(b.label)
    if (aCustom !== bCustom) return aCustom ? -1 : 1
    if (aCustom) return b.subtotalKRW - a.subtotalKRW
    return typeRank(a.label) - typeRank(b.label)
  })

  return entries
}

export interface CategoryDayChange {
  label: string
  changeKRW: number
  changePercent: number | null
}

/**
 * Per-category day-over-day change, derived from each holding's own price
 * source's changePercent (every price API already returns "change vs previous
 * close") rather than a stored historical snapshot — so this works from day
 * one with no separate tracking needed. Holdings with no known changePercent
 * (manual entries, cash) simply don't contribute. Sorted by absolute change
 * descending — biggest movers first.
 */
export function computeCategoryDayChanges(derivedList: DerivedHolding[]): CategoryDayChange[] {
  const map = new Map<string, { changeKRW: number; prevValueKRW: number }>()

  for (const d of derivedList) {
    const changePercent = d.info?.changePercent
    if (changePercent == null || d.currentValueKRW == null) continue
    const prevValueKRW = d.currentValueKRW / (1 + changePercent / 100)
    const changeKRW = d.currentValueKRW - prevValueKRW

    const key = d.h.category?.trim() || ASSET_TYPE_LABEL[d.h.type] || UNCATEGORIZED
    const entry = map.get(key) ?? { changeKRW: 0, prevValueKRW: 0 }
    entry.changeKRW += changeKRW
    entry.prevValueKRW += prevValueKRW
    map.set(key, entry)
  }

  return [...map.entries()]
    .map(([label, { changeKRW, prevValueKRW }]) => ({
      label,
      changeKRW,
      changePercent: prevValueKRW > 0 ? (changeKRW / prevValueKRW) * 100 : null,
    }))
    .sort((a, b) => Math.abs(b.changeKRW) - Math.abs(a.changeKRW))
}

export interface DayChange {
  changeKRW: number
  changePercent: number | null
}

/**
 * Total day-over-day change, computed the same way as computeCategoryDayChanges
 * (summed across all holdings, not grouped) so the two always reconcile exactly
 * — unlike diffing snapshot totals, which would also fold in FX-rate movement
 * and any deposits/trades made since the last visit, and so wouldn't match a
 * price-only breakdown.
 */
export function computeTotalDayChange(derivedList: DerivedHolding[]): DayChange | null {
  let changeKRW = 0
  let prevValueKRW = 0
  let any = false

  for (const d of derivedList) {
    const changePercent = d.info?.changePercent
    if (changePercent == null || d.currentValueKRW == null) continue
    any = true
    const prev = d.currentValueKRW / (1 + changePercent / 100)
    changeKRW += d.currentValueKRW - prev
    prevValueKRW += prev
  }

  if (!any) return null
  return { changeKRW, changePercent: prevValueKRW > 0 ? (changeKRW / prevValueKRW) * 100 : null }
}
