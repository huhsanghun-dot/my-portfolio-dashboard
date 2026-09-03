import type { HoldingIdentity, PriceInfo, Snapshot, Transaction } from '../types'
import { genId } from './id'
import { todayStr } from './positions'

const KEYS = {
  holdings: 'pf-dashboard:holdings:v1',
  transactions: 'pf-dashboard:transactions:v1',
  snapshots: 'pf-dashboard:snapshots:v1',
  syncCode: 'pf-dashboard:sync-code:v1',
  prices: 'pf-dashboard:prices:v1',
} as const

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private mode, quota) — fail silently, in-memory state still works this session
  }
}

/** A holding as it may still be shaped in a browser's existing localStorage, from before transactions existed. */
interface LegacyHoldingFields {
  quantity?: number
  avgBuyPrice?: number
}

export function loadHoldingIdentities(): HoldingIdentity[] {
  return readJSON<HoldingIdentity[]>(KEYS.holdings, [])
}

export function saveHoldingIdentities(holdings: HoldingIdentity[]): void {
  writeJSON(KEYS.holdings, holdings)
}

export function loadTransactions(): Transaction[] {
  return readJSON<Transaction[]>(KEYS.transactions, [])
}

export function saveTransactions(transactions: Transaction[]): void {
  writeJSON(KEYS.transactions, transactions)
}

/**
 * One-time migration for holdings created before buy/sell transactions existed:
 * any stored holding that still carries a legacy quantity/avgBuyPrice but has no
 * transaction of its own yet gets a synthetic initial BUY transaction, so its
 * position keeps computing correctly under the new (transaction-derived) model.
 */
export function migrateLegacyHoldingsToTransactions(
  rawHoldings: (HoldingIdentity & LegacyHoldingFields)[],
  transactions: Transaction[],
): Transaction[] {
  const holdingIdsWithTxns = new Set(transactions.map((t) => t.holdingId))
  const synthetic: Transaction[] = []

  for (const h of rawHoldings) {
    if (holdingIdsWithTxns.has(h.id)) continue
    if (!h.quantity || h.quantity <= 0) continue
    synthetic.push({
      id: genId(),
      holdingId: h.id,
      action: 'BUY',
      quantity: h.quantity,
      price: h.avgBuyPrice ?? 0,
      date: todayStr(),
      createdAt: Date.now(),
    })
  }

  if (synthetic.length === 0) return transactions
  const merged = [...transactions, ...synthetic]
  saveTransactions(merged)
  return merged
}

export function loadSnapshots(): Snapshot[] {
  return readJSON<Snapshot[]>(KEYS.snapshots, [])
}

export function saveSnapshots(snapshots: Snapshot[]): void {
  writeJSON(KEYS.snapshots, snapshots)
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Upserts today's snapshot with the latest total value (local date). If one or
 * more days were skipped since the last recorded snapshot (the app wasn't opened),
 * those gap days are backfilled with that last known value carried forward, so
 * the chart shows a flat line through the missed days instead of jumping
 * straight from the last visit to today.
 */
export function upsertTodaySnapshot(totalValueKRW: number): Snapshot[] {
  const date = todayStr()
  const existing = loadSnapshots()
  const last = existing.length > 0 ? existing[existing.length - 1] : null

  const filled = [...existing]
  if (last && last.date < date) {
    let cursor = addDays(parseDateStr(last.date), 1)
    const target = parseDateStr(date)
    // Sanity cap so malformed date data can't spin this into a near-infinite loop.
    for (let guard = 0; cursor < target && guard < 3650; guard += 1) {
      filled.push({ date: formatDateStr(cursor), totalValueKRW: last.totalValueKRW, updatedAt: last.updatedAt })
      cursor = addDays(cursor, 1)
    }
  }

  const idx = filled.findIndex((s) => s.date === date)
  const entry: Snapshot = { date, totalValueKRW, updatedAt: Date.now() }

  let next: Snapshot[]
  if (idx >= 0) {
    next = [...filled]
    next[idx] = entry
  } else {
    next = [...filled, entry].sort((a, b) => a.date.localeCompare(b.date))
  }
  saveSnapshots(next)
  return next
}

/**
 * Last-known price per holding, cached so the app can render real-looking
 * values immediately on load instead of a blank/loading state while the
 * network refresh (which can take several seconds against the free-tier
 * price server) is still in flight.
 */
export function loadPrices(): Record<string, PriceInfo> {
  return readJSON<Record<string, PriceInfo>>(KEYS.prices, {})
}

export function savePrices(prices: Record<string, PriceInfo>): void {
  writeJSON(KEYS.prices, prices)
}

/**
 * Merges two snapshot histories by date, keeping whichever side's entry for
 * a given date was written more recently (Snapshot.updatedAt). Used when
 * pulling synced state from another device: a plain overwrite would let a
 * stale sync store (e.g. one whose last push never completed before the tab
 * closed) silently revert already-recorded history on this device.
 */
export function mergeSnapshots(a: Snapshot[], b: Snapshot[]): Snapshot[] {
  const map = new Map<string, Snapshot>()
  for (const s of a) map.set(s.date, s)
  for (const s of b) {
    const existing = map.get(s.date)
    if (!existing || s.updatedAt > existing.updatedAt) map.set(s.date, s)
  }
  return [...map.values()].sort((x, y) => x.date.localeCompare(y.date))
}

/** The device's linked cross-device sync code, if any (see lib/api/sync.ts). */
export function loadSyncCode(): string | null {
  return readJSON<string | null>(KEYS.syncCode, null)
}

export function saveSyncCode(code: string | null): void {
  if (code == null) {
    try {
      localStorage.removeItem(KEYS.syncCode)
    } catch {
      // localStorage unavailable — nothing to clean up
    }
    return
  }
  writeJSON(KEYS.syncCode, code)
}
