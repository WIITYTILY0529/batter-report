/**
 * Cloudflare Worker — Baseball Savant proxy
 * Exposes: GET /gf?game_pk=<id>
 */

const ALLOWED_ORIGINS = [
  'https://WIITYTILY0529.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request, _env, _ctx) {
    const origin = request.headers.get('Origin') || ''
    const url = new URL(request.url)

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (url.pathname !== '/gf') {
      return new Response('Not Found', { status: 404, headers: corsHeaders(origin) })
    }

    const gamePk = url.searchParams.get('game_pk')
    if (!gamePk || !/^\d+$/.test(gamePk)) {
      return new Response(JSON.stringify({ error: 'game_pk is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const upstream = `https://baseballsavant.mlb.com/gf?game_pk=${gamePk}`

    try {
      const res = await fetch(upstream, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BatterReport/1.0)',
          'Accept': 'application/json',
        },
      })

      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Upstream error: ${res.status}` }), {
          status: res.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const data = await res.json()

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          ...corsHeaders(origin),
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  },
}
