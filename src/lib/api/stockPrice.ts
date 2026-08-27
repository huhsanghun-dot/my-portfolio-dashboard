import { fetchUsStockPrice, RATE_LIMIT_ERROR as AV_RATE_LIMIT_ERROR } from './alphaVantage'
import { fetchUsStockPriceFinnhub, FINNHUB_RATE_LIMIT_ERROR } from './finnhub'
import { fetchUsStockPriceYahoo } from './yahooFinance'
import type { PriceInfo } from '../../types'

export { AV_RATE_LIMIT_ERROR, FINNHUB_RATE_LIMIT_ERROR }

export interface StockFallbackParams {
  symbol: string
  finnhubApiKey: string
  avApiKey: string
  /** Skip the Finnhub attempt while it's already known to be rate-limited. */
  finnhubCoolingDown: boolean
  /** Skip the Alpha Vantage attempt while it's already known to be rate-limited. */
  avCoolingDown: boolean
}

/**
 * Fetches a US stock's price through an ordered fallback chain:
 * 1. Yahoo Finance — key-less, tried first, but its CORS support is undocumented
 *    and unreliable (some networks/browsers block it outright).
 * 2. Finnhub — needs a free key, but 60 calls/minute with confirmed CORS support
 *    makes it the source that can actually sustain periodic auto-refresh.
 * 3. Alpha Vantage — needs a free key, last resort given its 25-calls/day cap.
 * Returns the first successful quote, or the last attempt's error if all fail.
 */
export async function fetchUsStockPriceWithFallback(params: StockFallbackParams): Promise<PriceInfo> {
  const { symbol, finnhubApiKey, avApiKey, finnhubCoolingDown, avCoolingDown } = params

  const attempts: (() => Promise<PriceInfo>)[] = [() => fetchUsStockPriceYahoo(symbol)]
  if (finnhubApiKey && !finnhubCoolingDown) attempts.push(() => fetchUsStockPriceFinnhub(symbol, finnhubApiKey))
  if (avApiKey && !avCoolingDown) attempts.push(() => fetchUsStockPrice(symbol, avApiKey))

  let last: PriceInfo = { price: null, changePercent: null, updatedAt: null, source: 'none', error: '네트워크/CORS 오류' }
  for (const attempt of attempts) {
    last = await attempt()
    if (last.price != null) return last
  }
  return last
}
