/* =========================================================================
 * STGRMatchControl — Ubisoft R6 stats proxy (Cloudflare Worker)
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   Overlays run in a browser (OBS / a tab) and can't fetch player stats
 *   directly: stat sites send no CORS headers AND sit behind bot protection.
 *   So a tiny server-side hop is required. This Worker is that hop.
 *
 *   It talks to UBISOFT'S OWN API — the same backend the stats sites use —
 *   logging in with a Ubisoft account, then reading the PUBLIC stats of the
 *   IGNs you query. Results come back as clean JSON WITH a CORS header the
 *   overlay can read.
 *
 *   (The earlier tracker.gg version is gone: tracker.gg now hard-blocks all
 *   server-side fetches with a 403 JS-challenge. Ubisoft direct is reliable.)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SETUP  (one-time)
 *   1. Create a THROWAWAY Ubisoft account (free, fresh email, NO 2-factor).
 *      It only needs to be valid — it reads other players' public stats.
 *   2. Deploy this file as a Cloudflare Worker.
 *   3. Add two encrypted Worker Secrets (Settings → Variables and Secrets →
 *      "Add" → type: Secret), NOT plain-text variables:
 *          UBI_EMAIL     = the burner account email
 *          UBI_PASSWORD  = its password
 *      (Never put these in the code or commit them.)
 *   4. Redeploy. Test:  https://YOUR-worker.workers.dev/?name=Pengu
 *      Add &debug=1 to see the raw Ubisoft payload while setting up.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * RETURNS  (GET /?name=<IGN>&platform=uplay|psn|xbl)
 *   { ok:true,  name, platform, stats:{ kd, hs, winRate, kost } }
 *   { ok:false, name, error:"no_creds"|"auth_failed"|"not_found"|"upstream" }
 *
 * NOTE on metrics: Ubisoft's lifetime stats give K/D, Headshot % and Win %
 * reliably. KOST is a per-match esports metric Ubisoft does not expose here,
 * so kost is null and the overlay shows "—".
 * ========================================================================= */

const ALLOW_ORIGIN = '*';                 // or lock to 'https://you.github.io'
const CACHE_SECONDS = 600;                // edge-cache each player 10 min

// Ubisoft endpoints. APP_ID / spaceId are the long-standing public R6 values
// used by every community stats tool.
const UBI_APP_ID   = '39baebad-39e5-4552-8c25-2c9b919064e2';
const UBI_AUTH_URL = 'https://public-ubiservices.ubi.com/v3/profiles/sessions';
const SPACE_ID     = '5172a557-50b5-4665-b7db-e3f2e8c5041d';   // R6 PC space
const PLATFORM_URL = {                                          // sandbox per platform
  uplay: 'OSBOR_PC_LNCH_A', psn: 'OSBOR_PS4_LNCH_A', xbl: 'OSBOR_XBOXONE_LNCH_A'
};

// Friendly platform names -> Ubisoft platformType.
const PLATFORMS = {
  uplay: 'uplay', ubi: 'uplay', pc: 'uplay', ubisoft: 'uplay',
  psn: 'psn', ps: 'psn', playstation: 'psn',
  xbl: 'xbl', xbox: 'xbl', xb: 'xbl'
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: corsHeaders() });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    if (request.method !== 'GET')     return json({ ok: false, error: 'bad_request' }, 405);

    const url = new URL(request.url);
    const name = (url.searchParams.get('name') || '').trim();
    const platform = PLATFORMS[(url.searchParams.get('platform') || 'uplay').toLowerCase()] || 'uplay';
    const debug = url.searchParams.get('debug') === '1';
    if (!name) return json({ ok: false, error: 'bad_request' }, 400);

    if (!env || !env.UBI_EMAIL || !env.UBI_PASSWORD) {
      return json({ ok: false, name, error: 'no_creds' }, 200);
    }

    // edge cache (skip when debugging)
    const cache = caches.default;
    const cacheKey = new Request('https://stgr-ubi-cache/' + platform + '/' +
      encodeURIComponent(name.toLowerCase()), { method: 'GET' });
    if (!debug) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    let ticket;
    try { ticket = await getTicket(env); }
    catch (e) { return json({ ok: false, name, error: 'auth_failed', detail: String(e && e.message || e) }, 200); }

    // 1) resolve IGN -> Ubisoft profile id
    let profile;
    try { profile = await findProfile(ticket, name, platform); }
    catch (e) { return json({ ok: false, name, error: 'upstream', detail: String(e && e.message || e) }, 200); }
    if (!profile) return json({ ok: false, name, platform, error: 'not_found' }, 200);

    // 2) pull lifetime stats for that profile id
    let raw;
    try { raw = await fetchStats(ticket, profile.profileId, platform); }
    catch (e) { return json({ ok: false, name, error: 'upstream', detail: String(e && e.message || e) }, 200); }

    if (debug) return json({ ok: true, debug: true, profile, raw }, 200);

    const stats = extractStats(raw, profile.profileId);
    const out = { ok: true, name: profile.nameOnPlatform || name, platform, stats };

    const res = json(out, 200);
    const cacheable = new Response(res.body, res);
    cacheable.headers.set('Cache-Control', 'public, max-age=' + CACHE_SECONDS);
    await cache.put(cacheKey, cacheable.clone());
    return cacheable;
  }
};

/* ---- auth: email+password -> session ticket (cached in edge cache) ------- */
async function getTicket(env) {
  // Reuse a ticket across requests until it nears expiry, so we don't log in
  // on every overlay show. Tickets last ~2–3h; we refresh well before.
  const cache = caches.default;
  const tkKey = new Request('https://stgr-ubi-cache/__ticket__', { method: 'GET' });
  const hit = await cache.match(tkKey);
  if (hit) {
    const j = await hit.json();
    if (j && j.ticket && j.exp && (j.exp - Date.now()) > 5 * 60 * 1000) return j.ticket;
  }

  const basic = btoa(env.UBI_EMAIL + ':' + env.UBI_PASSWORD);
  const res = await fetch(UBI_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basic,
      'Ubi-AppId': UBI_APP_ID,
      'Content-Type': 'application/json',
      'User-Agent': 'STGRMatchControl/1.0'
    },
    body: JSON.stringify({ rememberMe: true })
  });
  if (!res.ok) {
    const t = await res.text().catch(function () { return ''; });
    throw new Error('auth HTTP ' + res.status + ' ' + t.slice(0, 120));
  }
  const data = await res.json();
  if (!data || !data.ticket) throw new Error('no ticket in auth response');

  // cache the ticket ~90 min
  const exp = Date.now() + 90 * 60 * 1000;
  const store = new Response(JSON.stringify({ ticket: data.ticket, exp: exp }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=5400' }
  });
  await cache.put(tkKey, store);
  return data.ticket;
}

function authHeaders(ticket) {
  return {
    'Authorization': 'Ubi_v1 t=' + ticket,
    'Ubi-AppId': UBI_APP_ID,
    'Ubi-SessionId': '',
    'Content-Type': 'application/json',
    'User-Agent': 'STGRMatchControl/1.0'
  };
}

/* ---- IGN -> profile id -------------------------------------------------- */
async function findProfile(ticket, name, platform) {
  const u = 'https://public-ubiservices.ubi.com/v3/profiles?nameOnPlatform=' +
    encodeURIComponent(name) + '&platformType=' + encodeURIComponent(platform);
  const res = await fetch(u, { headers: authHeaders(ticket) });
  if (!res.ok) throw new Error('profile HTTP ' + res.status);
  const data = await res.json();
  const p = data && data.profiles && data.profiles[0];
  return p ? { profileId: p.profileId, nameOnPlatform: p.nameOnPlatform } : null;
}

/* ---- lifetime stats for a profile id ------------------------------------ */
async function fetchStats(ticket, profileId, platform) {
  const sandbox = PLATFORM_URL[platform] || PLATFORM_URL.uplay;
  const metrics = [
    'generalpvp_kills', 'generalpvp_death', 'generalpvp_matchwon',
    'generalpvp_matchlost', 'generalpvp_matchplayed', 'generalpvp_headshot',
    'generalpvp_bullethit'
  ].join(',');
  const u = 'https://public-ubiservices.ubi.com/v1/spaces/' + SPACE_ID +
    '/sandboxes/' + sandbox + '/playerstats2/statistics' +
    '?populations=' + encodeURIComponent(profileId) + '&statistics=' + metrics;
  const res = await fetch(u, { headers: authHeaders(ticket) });
  if (!res.ok) throw new Error('stats HTTP ' + res.status);
  return await res.json();
}

/* ---- shape the numbers we show ------------------------------------------ *
 * Ubisoft returns { results: { <profileId>: { "<metric>:infinite": value }}}.
 * Metric keys carry a ":infinite" (or ":<seasonId>") suffix, so we match by
 * prefix and stay defensive about anything missing.
 * ------------------------------------------------------------------------- */
function extractStats(raw, profileId) {
  const bucket = (raw && raw.results && raw.results[profileId]) || {};
  function m(prefix) {
    const k = Object.keys(bucket).filter(function (key) { return key.indexOf(prefix) === 0; })[0];
    const v = k ? Number(bucket[k]) : null;
    return (v == null || isNaN(v)) ? null : v;
  }
  const kills    = m('generalpvp_kills');
  const deaths   = m('generalpvp_death');
  const won      = m('generalpvp_matchwon');
  const played   = m('generalpvp_matchplayed');
  const headshot = m('generalpvp_headshot');
  const bullets  = m('generalpvp_bullethit');

  const kd = (kills != null && deaths) ? (kills / deaths).toFixed(2) : null;
  const winRate = (won != null && played) ? Math.round((won / played) * 100) + '%' : null;
  const hs = (headshot != null && bullets) ? Math.round((headshot / bullets) * 100) + '%' : null;

  return { kd: kd, hs: hs, winRate: winRate, kost: null };
}
