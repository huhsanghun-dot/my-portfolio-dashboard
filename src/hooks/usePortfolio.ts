import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchUsStockPrice } from '../lib/api/alphaVantage'
import { fetchCryptoPrice } from '../lib/api/cryptoCom'
import { fetchUsdToKrwRate, FALLBACK_USD_KRW } from '../lib/api/fx'
import { fetchKrxPriceBestEffort } from '../lib/api/krx'
import { genId } from '../lib/id'
import { computeAllHoldings, computePosition, todayStr, transactionsFor } from '../lib/positions'
import {
  loadHoldingIdentities,
  loadSettings,
  loadSnapshots,
  loadTransactions,
  migrateLegacyHoldingsToTransactions,
  saveHoldingIdentities,
  saveSettings,
  saveTransactions,
  upsertTodaySnapshot,
} from '../lib/storage'
import type { AppSettings, Holding, HoldingIdentity, PriceInfo, Snapshot, Transaction, TransactionAction } from '../types'

const AUTO_REFRESH_MS = 60_000

export function effectivePrice(holding: Holding, info: PriceInfo | undefined): number | null {
  if (info?.price != null) return info.price
  if (holding.manualPrice != null) return holding.manualPrice
  return null
}

export interface NewHoldingInput {
  type: HoldingIdentity['type']
  name: string
  symbol: string
  currency: HoldingIdentity['currency']
  category?: string
  /** Initial BUY transaction that establishes the position. */
  quantity: number
  price: number
  date: string
}

export interface NewTransactionInput {
  action: TransactionAction
  quantity: number
  price: number
  date: string
}

export function usePortfolio() {
  const [identities, setIdentities] = useState<HoldingIdentity[]>(() => loadHoldingIdentities())
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const raw = loadHoldingIdentities() as (HoldingIdentity & { quantity?: number; avgBuyPrice?: number })[]
    const existing = loadTransactions()
    return migrateLegacyHoldingsToTransactions(raw, existing)
  })
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({})
  const [fxRate, setFxRate] = useState<number>(FALLBACK_USD_KRW)
  const [fxUpdatedAt, setFxUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots())

  const holdings = useMemo(() => computeAllHoldings(identities, transactions), [identities, transactions])
  const holdingsRef = useRef(holdings)
  holdingsRef.current = holdings
  const transactionsRef = useRef(transactions)
  transactionsRef.current = transactions

  useEffect(() => saveHoldingIdentities(identities), [identities])
  useEffect(() => saveTransactions(transactions), [transactions])
  useEffect(() => saveSettings(settings), [settings])

  const addHolding = useCallback((input: NewHoldingInput) => {
    const id = genId()
    const identity: HoldingIdentity = {
      id,
      type: input.type,
      name: input.name,
      symbol: input.symbol,
      currency: input.currency,
      category: input.category,
    }
    const txn: Transaction = {
      id: genId(),
      holdingId: id,
      action: 'BUY',
      quantity: input.quantity,
      price: input.price,
      date: input.date || todayStr(),
      createdAt: Date.now(),
    }
    setIdentities((prev) => [...prev, identity])
    setTransactions((prev) => [...prev, txn])
    return id
  }, [])

  const updateHolding = useCallback((id: string, patch: Partial<HoldingIdentity>) => {
    setIdentities((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  }, [])

  const removeHolding = useCallback((id: string) => {
    setIdentities((prev) => prev.filter((h) => h.id !== id))
    setTransactions((prev) => prev.filter((t) => t.holdingId !== id))
    setPrices((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  /** Returns an error message if the transaction is invalid (e.g. selling more than currently held), else null. */
  const addTransaction = useCallback((holdingId: string, input: NewTransactionInput): string | null => {
    if (!(input.quantity > 0) || !(input.price >= 0)) return '수량과 가격을 확인해주세요.'

    if (input.action === 'SELL') {
      const own = transactionsFor(transactionsRef.current, holdingId)
      const { quantity } = computePosition(own)
      if (input.quantity > quantity) {
        return `보유 수량(${quantity})보다 많이 매도할 수 없습니다.`
      }
    }

    const txn: Transaction = {
      id: genId(),
      holdingId,
      action: input.action,
      quantity: input.quantity,
      price: input.price,
      date: input.date || todayStr(),
      createdAt: Date.now(),
    }
    setTransactions((prev) => [...prev, txn])
    return null
  }, [])

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
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
      setIdentities((prev) =>
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
  useEffect(() => {
    if (holdings.length === 0) return
    const hasAnyPrice = holdings.some((h) => effectivePrice(h, prices[h.id]) != null)
    if (!hasAnyPrice) return
    if (refreshing) return
    const next = upsertTodaySnapshot(totalValueKRW)
    setSnapshots(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing])

  return {
    holdings,
    addHolding,
    updateHolding,
    removeHolding,
    transactions,
    addTransaction,
    removeTransaction,
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
