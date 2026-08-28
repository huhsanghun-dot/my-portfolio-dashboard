import { corsHeaders, resolveAllowedOrigin } from './cors.js'
import { getCrypto } from './crypto.js'
import { getUsStock } from './finnhub.js'
import { getKrStock } from './kiwoom.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const allowedOrigin = resolveAllowedOrigin(request, env)
    const headers = { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json;charset=UTF-8' }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers })
    }

    try {
      let result
      if (url.pathname === '/api/us-stock') {
        result = await getUsStock(url.searchParams.get('symbol'), env)
      } else if (url.pathname === '/api/kr-stock') {
        result = await getKrStock(url.searchParams.get('code'), env)
      } else if (url.pathname === '/api/crypto') {
        result = await getCrypto(url.searchParams.get('symbol'))
      } else if (url.pathname === '/health') {
        return new Response(JSON.stringify({ ok: true }), { headers })
      } else {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers })
      }
      return new Response(JSON.stringify(result), { headers })
    } catch (err) {
      return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
        status: 502,
        headers,
      })
    }
  },
}
