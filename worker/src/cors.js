/** Only our deployed frontend (and local dev servers) may call this API — the Kiwoom/Finnhub keys live only here. */
export function resolveAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  if (origin === env.ALLOWED_ORIGIN) return origin
  if (/^http:\/\/localhost:\d+$/.test(origin)) return origin
  return null
}

export function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin ?? 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}
