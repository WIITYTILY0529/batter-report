/**
 * Cloudflare Worker — Baseball Savant CORS Proxy
 * GET /gf?game_pk=<id>
 */

const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, _env, _ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === '/gf') {
      const gamePk = url.searchParams.get('game_pk');
      if (!gamePk || !/^\d+$/.test(gamePk)) {
        return jsonError(400, 'game_pk is required and must be numeric');
      }

      const savantUrl = `https://baseballsavant.mlb.com/gf?game_pk=${gamePk}`;
      let savantRes;
      try {
        savantRes = await fetch(savantUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });
      } catch (e) {
        return jsonError(502, `Failed to reach Baseball Savant: ${e.message}`);
      }

      if (!savantRes.ok) {
        return jsonError(savantRes.status, 'Baseball Savant returned an error');
      }

      const data = await savantRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    return jsonError(404, 'Not found. Use GET /gf?game_pk=<id>');
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
