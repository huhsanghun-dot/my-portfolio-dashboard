import type { PriceInfo } from '../../types'

interface UpbitTicker {
  trade_price?: number
  signed_change_rate?: number
}

/**
 * Fetches the latest KRW price for an Upbit market (e.g. "KRW-BTC") via Upbit's
 * public, key-less ticker endpoint — quoted directly in KRW, matching how the
 * user actually trades on Upbit (no USD/KRW conversion in between).
 */
export async function fetchCryptoPriceUpbit(market: string): Promise<PriceInfo> {
  const url = `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(market)}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as UpbitTicker[]
    const ticker = data[0]
    if (!ticker || ticker.trade_price == null) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '시세 없음' }
    }

    return {
      price: ticker.trade_price,
      changePercent: ticker.signed_change_rate != null ? ticker.signed_change_rate * 100 : null,
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
