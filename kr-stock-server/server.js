/**
 * Minimal, zero-dependency KRX stock/ETF quote proxy for Kiwoom Securities'
 * REST API. Runs as a plain Node.js HTTP server (Node 18+, uses global fetch)
 * on a host with a fixed public IP — Kiwoom requires the caller's IP to be
 * pre-registered, which rules out serverless platforms with rotating egress
 * IPs (see README.md for the full story).
 *
 * Config comes entirely from environment variables (see setup.sh):
 *   KIWOOM_APP_KEY, KIWOOM_SECRET_KEY  - required
 *   KIWOOM_DOMAIN   - default https://api.kiwoom.com (use mockapi.kiwoom.com to test)
 *   ALLOWED_ORIGIN  - default https://huhsanghun-dot.github.io
 *   PORT            - default 8080
 */

const http = require('http')

const PORT = process.env.PORT || 8080
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://huhsanghun-dot.github.io'
const KIWOOM_DOMAIN = process.env.KIWOOM_DOMAIN || 'https://api.kiwoom.com'
const KIWOOM_APP_KEY = process.env.KIWOOM_APP_KEY
const KIWOOM_SECRET_KEY = process.env.KIWOOM_SECRET_KEY

async function getKiwoomToken() {
  if (!KIWOOM_APP_KEY || !KIWOOM_SECRET_KEY) {
    throw new Error('KIWOOM_APP_KEY/KIWOOM_SECRET_KEY not configured')
  }
  const res = await fetch(`${KIWOOM_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ grant_type: 'client_credentials', appkey: KIWOOM_APP_KEY, secretkey: KIWOOM_SECRET_KEY }),
  })
  if (!res.ok) throw new Error(`Kiwoom token HTTP ${res.status}`)
  const data = await res.json()
  if (data.return_code !== 0) throw new Error(`Kiwoom token error: ${data.return_msg}`)
  return data.token
}

/** stkCode is the 6-digit KRX code, e.g. "005930" for Samsung Electronics. */
async function getKrStock(stkCode) {
  if (!stkCode) throw new Error('code is required')
  const token = await getKiwoomToken()

  // ka10007 "시세표성정보요청" — compact quote with current price (cur_prc) and
  // change percent (flu_rt), without the 10-level order-book depth heavier TRs return.
  const res = await fetch(`${KIWOOM_DOMAIN}/api/dostk/mrkcond`, {
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

  return { price, changePercent: Number.isFinite(changePercent) ? changePercent : null }
}

function applyCors(req, res) {
  const origin = req.headers.origin
  const allowed = origin === ALLOWED_ORIGIN || (!!origin && /^http:\/\/localhost:\d+$/.test(origin))
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res)
  res.setHeader('Content-Type', 'application/json;charset=UTF-8')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  try {
    if (url.pathname === '/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true }))
      return
    }
    if (url.pathname === '/api/kr-stock' && req.method === 'GET') {
      const result = await getKrStock(url.searchParams.get('code'))
      res.writeHead(200)
      res.end(JSON.stringify(result))
      return
    }
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'not found' }))
  } catch (err) {
    res.writeHead(502)
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
  }
})

server.listen(PORT, () => {
  console.log(`kr-stock-server listening on :${PORT}`)
})
