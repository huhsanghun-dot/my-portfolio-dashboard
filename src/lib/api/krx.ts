import type { PriceInfo } from '../../types'

interface NaverStockBasic {
  closePrice?: string
  compareToPreviousClosePrice?: string
  fluctuationsRatio?: string
}

function parseKrNumber(v?: string): number | null {
  if (!v) return null
  const n = Number.parseFloat(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Best-effort automatic price lookup for a KRX-listed ticker on page load.
 * KRX has no free, key-less, CORS-enabled real-time API, so this tries a
 * public quote endpoint and gracefully fails — callers should always fall
 * back to letting the user enter/confirm the price manually.
 */
export async function fetchKrxPriceBestEffort(krxCode: string): Promise<PriceInfo> {
  const url = `https://m.stock.naver.com/api/stock/${encodeURIComponent(krxCode)}/basic`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '자동 조회 실패' }
    }
    const data = (await res.json()) as NaverStockBasic
    const price = parseKrNumber(data.closePrice)
    if (price == null) {
      return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '자동 조회 실패' }
    }
    return {
      price,
      changePercent: parseKrNumber(data.fluctuationsRatio),
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return { price: null, changePercent: null, updatedAt: null, source: 'none', error: '자동 조회 실패 (수동 입력 필요)' }
  }
}
