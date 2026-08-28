import type { PriceInfo } from '../../types'

interface NaverStockBasic {
  closePrice?: string
  compareToPreviousClosePrice?: string
  fluctuationsRatio?: string
}

interface NaverPollingResponse {
  result?: {
    areas?: {
      datas?: {
        nv?: number | string
        cr?: number | string
      }[]
    }[]
  }
}

function parseKrNumber(v?: string | number | null): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number.parseFloat(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const FAIL_MANUAL: PriceInfo = {
  price: null,
  changePercent: null,
  updatedAt: null,
  source: 'none',
  error: '자동 조회 실패 (수동 입력 필요)',
}

async function fetchFromPolling(krxCode: string): Promise<PriceInfo | null> {
  const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${encodeURIComponent(krxCode)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as NaverPollingResponse
    const item = data.result?.areas?.[0]?.datas?.[0]
    const price = parseKrNumber(item?.nv)
    if (price == null) return null
    return {
      price,
      changePercent: parseKrNumber(item?.cr),
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return null
  }
}

async function fetchFromMobileBasic(krxCode: string): Promise<PriceInfo | null> {
  const url = `https://m.stock.naver.com/api/stock/${encodeURIComponent(krxCode)}/basic`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as NaverStockBasic
    const price = parseKrNumber(data.closePrice)
    if (price == null) return null
    return {
      price,
      changePercent: parseKrNumber(data.fluctuationsRatio),
      updatedAt: Date.now(),
      source: 'auto',
    }
  } catch {
    return null
  }
}

/**
 * Best-effort automatic price lookup for a KRX-listed ticker on page load.
 * KRX has no official free, key-less, CORS-enabled real-time API, so this
 * tries a couple of public Naver Finance endpoints and gracefully fails —
 * callers should always fall back to letting the user enter/confirm the
 * price manually.
 */
export async function fetchKrxPriceBestEffort(krxCode: string): Promise<PriceInfo> {
  return (await fetchFromPolling(krxCode)) ?? (await fetchFromMobileBasic(krxCode)) ?? FAIL_MANUAL
}
