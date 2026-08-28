export type AssetType = 'US_STOCK' | 'CRYPTO' | 'KR_ETF'

export type Currency = 'USD' | 'KRW'

export type TransactionAction = 'BUY' | 'SELL'

/** A holding's identity — what it is, not how much of it you own. Quantity/avg cost are derived from its transactions. */
export interface HoldingIdentity {
  id: string
  type: AssetType
  /** Display name, e.g. "Apple Inc." or "TIGER 나스닥100" */
  name: string
  /** Ticker/symbol used for API lookups. For crypto e.g. "BTC_USDT". For KR ETF, the 6-digit KRX code, e.g. "133690". */
  symbol: string
  currency: Currency
  /** User-entered price for KR ETFs (or as a fallback when auto price lookup fails). */
  manualPrice?: number
  /** User-defined grouping label that can span asset types, e.g. "QQQ" for both QQQM and TIGER 미국나스닥100. */
  category?: string
}

/** A holding's identity plus its position (quantity/avg buy price), computed from its buy/sell transactions. */
export interface Holding extends HoldingIdentity {
  quantity: number
  avgBuyPrice: number
}

/** One buy or sell record. Quantity/avg buy price on a Holding are always derived by replaying these in date order. */
export interface Transaction {
  id: string
  holdingId: string
  action: TransactionAction
  quantity: number
  /** Price per unit, in the holding's currency. */
  price: number
  /** yyyy-MM-dd */
  date: string
  createdAt: number
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
