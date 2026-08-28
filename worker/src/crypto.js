/** Crypto price via Crypto.com Exchange's public (key-less) ticker endpoint. */
export async function getCrypto(instrumentName) {
  if (!instrumentName) throw new Error('symbol is required')

  const url = `https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=${encodeURIComponent(instrumentName)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Crypto.com HTTP ${res.status}`)

  const data = await res.json()
  const ticker = data.result?.data?.[0]
  const priceStr = ticker?.a ?? ticker?.k ?? ticker?.b
  if (!ticker || !priceStr) throw new Error('no price returned')

  return {
    price: Number.parseFloat(priceStr),
    changePercent: ticker.c ? Number.parseFloat(ticker.c) * 100 : null,
  }
}
