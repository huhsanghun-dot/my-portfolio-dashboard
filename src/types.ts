export type AssetType = 'US_STOCK' | 'CRYPTO' | 'KR_ETF'

export type Currency = 'USD' | 'KRW'

export interface Holding {
  id: string
  type: AssetType
  /** Display name, e.g. "Apple Inc." or "TIGER 나스닥100" */
  name: string
  /** Ticker/symbol used for API lookups. For crypto e.g. "BTC_USDT". For KR ETF, the 6-digit KRX code, e.g. "133690". */
  symbol: string
  quantity: number
  avgBuyPrice: number
  currency: Currency
  /** User-entered price for KR ETFs (or as a fallback when auto price lookup fails). */
  manualPrice?: number
}

export interface PriceInfo {
  price: number | null
  changePercent: number | null
  updatedAt: number | null
  source: 'auto' | 'manual' | 'none'
  error?: string
}

export interface Snapshot {
  /** yyyy-MM-dd, local date */
  date: string
  totalValueKRW: number
  updatedAt: number
}

export interface AppSettings {
  alphaVantageApiKey: string
}
