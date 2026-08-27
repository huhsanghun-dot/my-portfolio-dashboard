/** Fallback USD→KRW rate used when the live FX API is unreachable. */
export const FALLBACK_USD_KRW = 1400

interface FrankfurterResponse {
  rates?: { KRW?: number }
}

/** Fetches the current USD→KRW exchange rate from a free, key-less FX API. */
export async function fetchUsdToKrwRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW')
    if (!res.ok) return FALLBACK_USD_KRW
    const data = (await res.json()) as FrankfurterResponse
    return data.rates?.KRW ?? FALLBACK_USD_KRW
  } catch {
    return FALLBACK_USD_KRW
  }
}
