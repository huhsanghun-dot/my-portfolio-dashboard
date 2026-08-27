import type { PriceInfo } from '../../types'

interface ChartResponse {
  chart?: {
    result?: {
      meta?: {
        regularMarketPrice?: number
        previousClose?: number
        chartPreviousClose?: number
      }
    }[]
    error?: { description?: string } | null
  }
}

/**
 * Fetches a US-listed stock's latest price from Yahoo Finance's public (unofficial,
 * undocumented) chart endpoint. No API key and no meaningful rate limit for personal
 * use — used as the primary source since Alpha Vantage's free tier (25 calls/day) is
 * too restrictive for periodic auto-refresh. Being unofficial, it could change or
 * start rejecting browser requests without notice, which is what the Alpha Vantage
 * fallback in stockPrice.ts is for.
 */
export async function fetchUsStockPriceYahoo(symbol: string): Promise<PriceInfo> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as ChartResponse
    const meta = data.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    const prevClose = meta?.previousClose ?? meta?.chartPreviousClose

    if (price == null) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '시세 없음' }
    }

    return {
      price,
      changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '네트워크/CORS 오류' }
  }
}
