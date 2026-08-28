/** US stock quote via Finnhub (free tier: 60 calls/min). */
export async function getUsStock(symbol, env) {
  if (!symbol) throw new Error('symbol is required')
  if (!env.FINNHUB_API_KEY) throw new Error('FINNHUB_API_KEY not configured')

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(env.FINNHUB_API_KEY)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`)

  const data = await res.json()
  const price = data.c
  if (!price) throw new Error('no price returned')

  return {
    price,
    changePercent: data.pc ? ((price - data.pc) / data.pc) * 100 : null,
  }
}
