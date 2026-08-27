import type { PriceInfo } from '../../types'

/** Finnhub's free tier caps at 60 calls/minute (no daily cap), plenty for periodic auto-refresh. */
export const FINNHUB_RATE_LIMIT_ERROR = 'Finnhub 호출 한도 초과 (잠시 후 재시도)'

interface FinnhubQuote {
  c?: number // current price
  pc?: number // previous close
}

/**
 * Fetches a US stock's latest quote from Finnhub. Requires a free API key
 * (finnhub.io, no card needed) — its 60-calls/minute free tier and documented
 * client-side/CORS support make it a far more usable auto-refresh source than
 * Alpha Vantage's 25-calls/day cap.
 */
export async function fetchUsStockPriceFinnhub(symbol: string, apiKey: string): Promise<PriceInfo> {
  if (!apiKey) {
    return { price: null, changePercent: null, updatedAt: null, source: 'none', error: 'Finnhub 키 필요' }
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`

  try {
    const res = await fetch(url)
    if (res.status === 429) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: FINNHUB_RATE_LIMIT_ERROR }
    }
    if (!res.ok) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as FinnhubQuote
    const price = data.c

    if (!price) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '시세 없음' }
    }

    return {
      price,
      changePercent: data.pc ? ((price - data.pc) / data.pc) * 100 : null,
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '네트워크/CORS 오류' }
  }
}
