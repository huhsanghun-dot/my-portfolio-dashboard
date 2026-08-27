import type { PriceInfo } from '../../types'

interface TickerData {
  i?: string
  a?: string // last traded price
  b?: string // best bid
  k?: string // best ask
  c?: string // 24h change (decimal fraction, e.g. 0.015 = 1.5%)
}

interface TickersResponse {
  code?: number
  result?: {
    data?: TickerData[]
  }
}

/**
 * Fetches the latest price for a Crypto.com Exchange instrument (e.g. "BTC_USDT")
 * via the public, key-less get-tickers endpoint.
 */
export async function fetchCryptoPrice(instrumentName: string): Promise<PriceInfo> {
  const url = `https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=${encodeURIComponent(
    instrumentName,
  )}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as TickersResponse
    const ticker = data.result?.data?.[0]

    const priceStr = ticker?.a ?? ticker?.k ?? ticker?.b
    if (!ticker || !priceStr) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '시세 없음' }
    }

    return {
      price: Number.parseFloat(priceStr),
      changePercent: ticker.c ? Number.parseFloat(ticker.c) * 100 : null,
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return {
      price: null,
      changePercent: null,
      updatedAt: null,
      source: 'none',
      error: '네트워크/CORS 오류',
    }
  }
}
