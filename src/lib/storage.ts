import type { AppSettings, HoldingIdentity, Snapshot, Transaction } from '../types'
import { genId } from './id'
import { todayStr } from './positions'

const KEYS = {
  holdings: 'pf-dashboard:holdings:v1',
  transactions: 'pf-dashboard:transactions:v1',
  settings: 'pf-dashboard:settings:v1',
  snapshots: 'pf-dashboard:snapshots:v1',
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

const DEFAULT_SETTINGS: AppSettings = {
  alphaVantageApiKey: '',
}

export function loadSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<AppSettings>>(KEYS.settings, {}) }
}

export function saveSettings(settings: AppSettings): void {
  writeJSON(KEYS.settings, settings)
}

export function loadSnapshots(): Snapshot[] {
  return readJSON<Snapshot[]>(KEYS.snapshots, [])
}

export function saveSnapshots(snapshots: Snapshot[]): void {
  writeJSON(KEYS.snapshots, snapshots)
}

/** Upserts today's snapshot with the latest total value (local date). */
export function upsertTodaySnapshot(totalValueKRW: number): Snapshot[] {
  const date = todayStr()
  const snapshots = loadSnapshots()
  const idx = snapshots.findIndex((s) => s.date === date)
  const entry: Snapshot = { date, totalValueKRW, updatedAt: Date.now() }

  let next: Snapshot[]
  if (idx >= 0) {
    next = [...snapshots]
    next[idx] = entry
  } else {
    next = [...snapshots, entry].sort((a, b) => a.date.localeCompare(b.date))
  }
  saveSnapshots(next)
  return next
}
