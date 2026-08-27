import type { AppSettings, Holding, Snapshot } from '../types'

const KEYS = {
  holdings: 'pf-dashboard:holdings:v1',
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

export function loadHoldings(): Holding[] {
  return readJSON<Holding[]>(KEYS.holdings, [])
}

export function saveHoldings(holdings: Holding[]): void {
  writeJSON(KEYS.holdings, holdings)
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

/** Upserts today's snapshot with the latest total value (KST-local date). */
export function upsertTodaySnapshot(totalValueKRW: number): Snapshot[] {
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`

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
