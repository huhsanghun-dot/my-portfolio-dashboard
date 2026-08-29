import type { AssetType } from '../types'

/** Fixed display order: 해외주식 - 국내주식 - 가상화폐 - 현금자산. */
export const ASSET_TYPE_ORDER: AssetType[] = ['US_STOCK', 'KR_ETF', 'CRYPTO', 'CASH']

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  US_STOCK: '해외주식',
  KR_ETF: '국내주식',
  CRYPTO: '암호화폐',
  CASH: '현금자산',
}
