import { fetchUsStockPriceFinnhub, FINNHUB_RATE_LIMIT_ERROR } from './finnhub'
import { fetchUsStockPriceYahoo } from './yahooFinance'
import type { PriceInfo } from '../../types'

export { FINNHUB_RATE_LIMIT_ERROR }

export interface StockFallbackParams {
  symbol: string
  finnhubApiKey: string
  /** Skip the Finnhub attempt while it's already known to be rate-limited. */
  finnhubCoolingDown: boolean
}

/**
 * Fetches a US stock's price through an ordered fallback chain:
 * 1. Yahoo Finance — key-less, tried first, but its CORS support is undocumented
 *    and unreliable (some networks/browsers block it outright).
 * 2. Finnhub — needs a free key, but 60 calls/minute with confirmed CORS support
 *    makes it the source that can actually sustain periodic auto-refresh.
 * Returns the first successful quote, or the last attempt's error if all fail.
 */
export async function fetchUsStockPriceWithFallback(params: StockFallbackParams): Promise<PriceInfo> {
  const { symbol, finnhubApiKey, finnhubCoolingDown } = params

  const attempts: (() => Promise<PriceInfo>)[] = [() => fetchUsStockPriceYahoo(symbol)]
  if (finnhubApiKey && !finnhubCoolingDown) attempts.push(() => fetchUsStockPriceFinnhub(symbol, finnhubApiKey))

  let last: PriceInfo = { price: null, changePercent: null, updatedAt: null, source: 'none', error: '네트워크/CORS 오류' }
  for (const attempt of attempts) {
    last = await attempt()
    if (last.price != null) return last
  }
  return last
}
