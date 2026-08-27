import type { PriceInfo } from '../../types'

interface GlobalQuoteResponse {
  'Global Quote'?: {
    '05. price'?: string
    '10. change percent'?: string
  }
  Note?: string
  Information?: string
}

/**
 * Fetches the latest quote for a US-listed stock symbol via Alpha Vantage's
 * GLOBAL_QUOTE endpoint. Requires a (free) API key supplied by the user.
 */
export async function fetchUsStockPrice(symbol: string, apiKey: string): Promise<PriceInfo> {
  if (!apiKey) {
    return { price: null, changePercent: null, updatedAt: null, source: 'none', error: 'API 키 필요' }
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
    symbol,
  )}&apikey=${encodeURIComponent(apiKey)}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as GlobalQuoteResponse

    if (data.Note || data.Information) {
      return {
        price: null,
        changePercent: null,
        updatedAt: null,
        source: 'none',
        error: '호출 한도 초과 (잠시 후 재시도)',
      }
    }

    const quote = data['Global Quote']
    const priceStr = quote?.['05. price']
    const changeStr = quote?.['10. change percent']

    if (!priceStr) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '시세 없음' }
    }

    return {
      price: Number.parseFloat(priceStr),
      changePercent: changeStr ? Number.parseFloat(changeStr.replace('%', '')) : null,
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '네트워크 오류' }
  }
}
