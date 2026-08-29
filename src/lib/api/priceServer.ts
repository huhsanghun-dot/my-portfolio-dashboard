import type { PriceInfo } from '../../types'
import { PRICE_SERVER_BASE_URL } from './priceServerConfig'

interface ServerQuote {
  price?: number
  changePercent?: number | null
  error?: string
}

async function fetchFromServer(path: string): Promise<PriceInfo> {
  try {
    const res = await fetch(`${PRICE_SERVER_BASE_URL}${path}`)
    const data = (await res.json()) as ServerQuote
    if (!res.ok || data.price == null) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: data.error ?? '자동 조회 실패' }
    }
    return { price: data.price, changePercent: data.changePercent ?? null, updatedAt: Date.now(), source: 'auto' }
  } catch {
    return {
      price: null,
      changePercent: null,
      updatedAt: null,
      source: 'none',
      error: '자동 조회 실패 (서버 연결 오류, 서버가 잠들어있으면 첫 요청은 시간이 걸릴 수 있어요)',
    }
  }
}

export function fetchUsStockPriceFromServer(symbol: string): Promise<PriceInfo> {
  return fetchFromServer(`/api/us-stock?symbol=${encodeURIComponent(symbol)}`)
}

export function fetchKrStockPriceFromServer(code: string): Promise<PriceInfo> {
  return fetchFromServer(`/api/kr-stock?code=${encodeURIComponent(code)}`)
}

export function fetchCryptoPriceFromServer(market: string): Promise<PriceInfo> {
  return fetchFromServer(`/api/crypto?market=${encodeURIComponent(market)}`)
}
