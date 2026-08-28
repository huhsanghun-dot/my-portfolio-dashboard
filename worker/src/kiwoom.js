/**
 * KRX stock/ETF quote via Kiwoom Securities' REST API (requires a real brokerage
 * account + app key/secret). Fetches a fresh OAuth token per request — no caching
 * yet, since this is a low-volume personal dashboard; worth revisiting with KV
 * caching if call volume grows.
 */

async function getKiwoomToken(env) {
  if (!env.KIWOOM_APP_KEY || !env.KIWOOM_SECRET_KEY) {
    throw new Error('KIWOOM_APP_KEY/KIWOOM_SECRET_KEY not configured')
  }

  const domain = env.KIWOOM_DOMAIN || 'https://api.kiwoom.com'
  const res = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: env.KIWOOM_APP_KEY,
      secretkey: env.KIWOOM_SECRET_KEY,
    }),
  })
  if (!res.ok) throw new Error(`Kiwoom token HTTP ${res.status}`)

  const data = await res.json()
  if (data.return_code !== 0) throw new Error(`Kiwoom token error: ${data.return_msg}`)
  return data.token
}

/** stk_cd is the 6-digit KRX code, e.g. "069500" for KODEX 200. */
export async function getKrStock(stkCode, env) {
  if (!stkCode) throw new Error('code is required')

  const domain = env.KIWOOM_DOMAIN || 'https://api.kiwoom.com'
  const token = await getKiwoomToken(env)

  // ka10007 "시세표성정보요청" — a compact quote-board style response including
  // current price (cur_prc) and change percent (flu_rt), without the 10-level
  // order book depth heavier TRs return.
  const res = await fetch(`${domain}/api/dostk/mrkcond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'api-id': 'ka10007',
    },
    body: JSON.stringify({ stk_cd: stkCode }),
  })
  if (!res.ok) throw new Error(`Kiwoom quote HTTP ${res.status}`)

  const data = await res.json()
  if (data.return_code !== 0) throw new Error(`Kiwoom quote error: ${data.return_msg}`)

  // cur_prc carries a leading +/- indicating direction vs. previous close, not the
  // price's own sign — the price itself is always a magnitude.
  const price = Math.abs(Number.parseInt(data.cur_prc, 10))
  const changePercent = Number.parseFloat(data.flu_rt)
  if (!Number.isFinite(price) || price === 0) throw new Error('no price returned')

  return {
    price,
    changePercent: Number.isFinite(changePercent) ? changePercent : null,
  }
}
