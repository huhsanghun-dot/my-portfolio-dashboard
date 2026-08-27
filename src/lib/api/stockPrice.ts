import { fetchUsStockPrice, RATE_LIMIT_ERROR } from './alphaVantage'
import { fetchUsStockPriceYahoo } from './yahooFinance'
import type { PriceInfo } from '../../types'

export { RATE_LIMIT_ERROR }

/**
 * Fetches a US stock's price, trying key-less Yahoo Finance first (fast refresh,
 * no meaningful daily limit) and only falling back to Alpha Vantage — which is
 * capped at 25 calls/day on the free tier — when Yahoo fails and a key is
 * available. `avCoolingDown` skips the fallback entirely while Alpha Vantage is
 * already known to be rate-limited, so a Yahoo outage can't hammer it further.
 */
export async function fetchUsStockPriceWithFallback(
  symbol: string,
  apiKey: string,
  avCoolingDown: boolean,
): Promise<PriceInfo> {
  const primary = await fetchUsStockPriceYahoo(symbol)
  if (primary.price != null) return primary
  if (!apiKey || avCoolingDown) return primary
  return fetchUsStockPrice(symbol, apiKey)
}
