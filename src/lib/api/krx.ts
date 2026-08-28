import type { PriceInfo } from '../../types'
import { fetchKrStockPriceFromServer } from './priceServer'

/** Automatic price lookup for a KRX-listed ticker, via the pykrx-backed price server. */
export function fetchKrxPriceBestEffort(krxCode: string): Promise<PriceInfo> {
  return fetchKrStockPriceFromServer(krxCode)
}
