import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUsStockPrice } from '../lib/api/alphaVantage'
import { fetchCryptoPrice } from '../lib/api/cryptoCom'
import { fetchUsdToKrwRate, FALLBACK_USD_KRW } from '../lib/api/fx'
import { fetchKrxPriceBestEffort } from '../lib/api/krx'
import {
  loadHoldings,
  loadSettings,
  loadSnapshots,
  saveHoldings,
  saveSettings,
  upsertTodaySnapshot,
} from '../lib/storage'
import type { AppSettings, Holding, PriceInfo, Snapshot } from '../types'

const AUTO_REFRESH_MS = 60_000

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function effectivePrice(holding: Holding, info: PriceInfo | undefined): number | null {
  if (info?.price != null) return info.price
  if (holding.manualPrice != null) return holding.manualPrice
  return null
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>(() => loadHoldings())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({})
  const [fxRate, setFxRate] = useState<number>(FALLBACK_USD_KRW)
  const [fxUpdatedAt, setFxUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots())
  const holdingsRef = useRef(holdings)
  holdingsRef.current = holdings

  useEffect(() => saveHoldings(holdings), [holdings])
  useEffect(() => saveSettings(settings), [settings])

  const addHolding = useCallback((h: Omit<Holding, 'id'>) => {
    setHoldings((prev) => [...prev, { ...h, id: genId() }])
  }, [])

  const updateHolding = useCallback((id: string, patch: Partial<Holding>) => {
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  }, [])

  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id))
    setPrices((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const refreshPricesFor = useCallback(async (targets: Holding[]) => {
    if (targets.length === 0) return
    setRefreshing(true)
    try {
      const currentSettings = loadSettings()
      const results = await Promise.all(
        targets.map(async (h): Promise<[string, PriceInfo]> => {
          if (h.type === 'US_STOCK') return [h.id, await fetchUsStockPrice(h.symbol, currentSettings.alphaVantageApiKey)]
          if (h.type === 'CRYPTO') return [h.id, await fetchCryptoPrice(h.symbol)]
          return [h.id, await fetchKrxPriceBestEffort(h.symbol)]
        }),
      )
      setPrices((prev) => {
        const next = { ...prev }
        for (const [id, info] of results) next[id] = info
        return next
      })
      // For KR ETFs, a successful auto-fetch refreshes the persisted manual price too,
      // so it stays the source of truth even when the next fetch attempt fails.
      setHoldings((prev) =>
        prev.map((h) => {
          if (h.type !== 'KR_ETF') return h
          const found = results.find(([id]) => id === h.id)
          const info = found?.[1]
          if (info?.price != null) return { ...h, manualPrice: info.price }
          return h
        }),
      )
    } finally {
      setRefreshing(false)
    }
  }, [])

  const refreshAll = useCallback(() => {
    void refreshPricesFor(holdingsRef.current)
  }, [refreshPricesFor])

  const refreshFx = useCallback(async () => {
    const rate = await fetchUsdToKrwRate()
    setFxRate(rate)
    setFxUpdatedAt(Date.now())
  }, [])

  // Initial load: fetch FX + all prices once (covers the "on every visit" KRX requirement too).
  useEffect(() => {
    void refreshFx()
    void refreshPricesFor(holdingsRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh loop for stock/crypto (KRX is intentionally left to page-load + manual refresh).
  useEffect(() => {
    const interval = setInterval(() => {
      const liveTargets = holdingsRef.current.filter((h) => h.type === 'US_STOCK' || h.type === 'CRYPTO')
      void refreshPricesFor(liveTargets)
      void refreshFx()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [refreshPricesFor, refreshFx])

  // Fetch prices for any newly-added holding right away.
  const knownIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newOnes = holdings.filter((h) => !knownIdsRef.current.has(h.id))
    knownIdsRef.current = new Set(holdings.map((h) => h.id))
    if (newOnes.length > 0) void refreshPricesFor(newOnes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings])

  // Cost is only summed for holdings with a known current price, so total value vs.
  // total cost stay comparable (a holding whose price failed to load shouldn't make
  // the portfolio look like it lost 100% of that position).
  let totalValueKRW = 0
  let totalCostKRW = 0
  for (const h of holdings) {
    const price = effectivePrice(h, prices[h.id])
    if (price == null) continue
    const nativeValue = price * h.quantity
    const nativeCost = h.avgBuyPrice * h.quantity
    const toKRW = (v: number) => (h.currency === 'USD' ? v * fxRate : v)
    totalValueKRW += toKRW(nativeValue)
    totalCostKRW += toKRW(nativeCost)
  }

  // Snapshot today's total once we have at least one successful price and holdings exist.
  const snapshottedRef = useRef(false)
  useEffect(() => {
    if (holdings.length === 0) return
    const hasAnyPrice = holdings.some((h) => effectivePrice(h, prices[h.id]) != null)
    if (!hasAnyPrice) return
    if (refreshing) return
    const next = upsertTodaySnapshot(totalValueKRW)
    setSnapshots(next)
    snapshottedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing])

  return {
    holdings,
    addHolding,
    updateHolding,
    removeHolding,
    settings,
    setSettings,
    prices,
    fxRate,
    fxUpdatedAt,
    refreshing,
    refreshAll,
    totalValueKRW,
    totalCostKRW,
    snapshots,
  }
}
