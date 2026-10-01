// =============================================================================
// SESEMSG cloud relay - remote viewing from any network (Cloudflare Worker)
// =============================================================================
// The hub (door node, firmware/door_sensor/src/hub.cpp) has no address anyone
// outside the building can reach. So it reaches OUT: whenever it has internet
// (facility Wi-Fi, a pocket router), it pushes its dashboard summary here
// every few seconds. Caregivers away from the building - another network,
// mobile data - open this relay's fixed https:// address and get the same
// page and passcode as on site.
//
//   hub  --POST /hub/push (X-Hub-Key)-->  relay  <--GET /api/v1/summary--  phones
//        <--pending acknowledgements--           <--POST .../ack---------
//
// Acknowledge works remotely: the relay shows it at once and hands it to the
// hub in the reply to its next push; the hub records it, clears the
// wearable's SOS, and its next summary confirms it.
//
// Honest limits:
//   * Remote data is only as fresh as the last push (about 3 s). If the hub
//     stops pushing, ages keep counting up, the resident turns "not
//     reporting" after 30 s like on site, and a "Hub not reporting to the
//     relay" alert says why.
//   * The relay keeps only the LAST summary and the acknowledgements still on
//     their way (saved in the object's storage, so a quiet hub's last state
//     survives the object being unloaded). The hub keeps the record.
//   * Free Cloudflare plan: 100,000 requests a day. A push every 3 s is about
//     29,000; each remote phone polling every 3 s adds about 29,000 per day of
//     viewing. Plenty for the defense; a real facility would need a paid plan
//     or longer intervals.
//
// Settings (wrangler secret put ...): HUB_KEY, PASSCODE, SESSION_KEY.
// The JSON matches dashboard/app/main.py, so the page is the unchanged v2 page
// (relay/build_page.py packs it into src/page.html).
// =============================================================================

import PAGE from './page.html';

const STALE_PUSH_S = 15;       // no push for this long: warn that remote data is old
const SESSION_S = 12 * 3600;   // same as dashboard/app/auth.py
const LOCK_AFTER = 5, LOCK_WINDOW_S = 300, LOCK_FOR_S = 60;

export default {
  async fetch(request, env) {
    // one relay object holds the state; every request goes to it
    const stub = env.RELAY.get(env.RELAY.idFromName('sesemsg'));
    return stub.fetch(request);
  },
};

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

async function hmacHex(key, text) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// constant-time string compare
function same(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export class Relay {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.summary = null;       // last summary from the hub (parsed)
    this.pushedAt = 0;         // ms, relay clock
    this.pushes = 0;
    this.pendingAcks = new Map();   // alert id -> { id, by, at }
    this.failures = [];
    this.lockedUntil = 0;
    // Cloudflare unloads an idle object; when the hub has gone quiet that is
    // exactly when its last state matters, so it is kept in storage.
    state.blockConcurrencyWhile(async () => {
      const v = await state.storage.get(['summary', 'pushedAt', 'acks']);
      if (v.get('summary')) this.summary = JSON.parse(v.get('summary'));
      this.pushedAt = v.get('pushedAt') || 0;
      for (const a of v.get('acks') || []) this.pendingAcks.set(a.id, a);
    });
  }

  save(withSummary) {
    const put = { pushedAt: this.pushedAt, acks: [...this.pendingAcks.values()] };
    if (withSummary) put.summary = JSON.stringify(this.summary);
    return this.state.storage.put(put);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname, m = request.method;
    try {
      if (m === 'GET' && (p === '/' || p === '/index.html'))
        return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
      if (m === 'POST' && p === '/hub/push') return this.push(request);
      if (m === 'GET' && p === '/api/v1/health')
        return json({ ok: true, server_time: Date.now() / 1000, relay: true, hub_age_s: this.hubAge() });
      if (p === '/api/v1/auth/status' && m === 'GET')
        return json({ required: true, authenticated: await this.authed(request), length: this.passcode().length, relay: true });
      if (p === '/api/v1/auth/login' && m === 'POST') return this.login(request);
      if (p === '/api/v1/auth/logout' && m === 'POST')
        return json({ ok: true }, 200, { 'Set-Cookie': 'trodes_session=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax' });
      if (p.startsWith('/api/')) {
        if (!(await this.authed(request))) return json({ detail: 'passcode required' }, 401);
        if (m === 'GET' && p === '/api/v1/summary') return json(this.view());
        const ack = p.match(/^\/api\/v1\/alerts\/(-?\d+)\/ack$/);
        if (m === 'POST' && ack) return this.ack(Number(ack[1]), request);
        return json({ detail: 'Not Found' }, 404);
      }
      if (m === 'GET' && p === '/favicon.ico') return new Response(null, { status: 204 });
      return Response.redirect(url.origin + '/', 302);
    } catch (err) {
      return json({ detail: 'relay error', error: String(err) }, 500);
    }
  }

  passcode() { return String(this.env.PASSCODE || ''); }
  hubAge() { return this.pushedAt ? Math.round((Date.now() - this.pushedAt) / 100) / 10 : null; }

  // ------------------------------------------------------------ hub -> relay
  async push(request) {
    // read the whole body before answering, even to refuse it: answering first
    // leaves the upload half-read and the connection is dropped
    const text = await request.text();
    const key = request.headers.get('X-Hub-Key') || '';
    if (!this.env.HUB_KEY || !same(key, this.env.HUB_KEY)) return json({ detail: 'bad hub key' }, 403);
    let body;
    try { body = JSON.parse(text); } catch (e) { return json({ detail: 'not JSON' }, 400); }
    if (!body || typeof body !== 'object' || !Array.isArray(body.residents)) return json({ detail: 'not a summary' }, 422);
    this.summary = body;
    this.pushedAt = Date.now();
    this.pushes++;
    // an acknowledgement is delivered until the hub's summary shows it done
    const done = new Set();
    for (const a of body.alerts_recent || []) if (a.acknowledged_at || a.cleared_at) done.add(a.id);
    const active = new Set((body.alerts_active || []).map(a => a.id));
    for (const id of [...this.pendingAcks.keys()]) if (done.has(id) || !active.has(id) && !this.inRecent(id)) this.pendingAcks.delete(id);
    await this.save(true);
    return json({ ok: true, now: Date.now() / 1000, acks: [...this.pendingAcks.values()] });
  }

  inRecent(id) { return (this.summary?.alerts_recent || []).some(a => a.id === id); }

  // ------------------------------------------------------- relay -> phones
  // The hub's summary, aged to now: the seconds-ago fields keep counting, so a
  // hub that goes quiet shows up exactly as a silent device would on site.
  view() {
    const now = Date.now() / 1000;
    if (!this.summary) {
      return {
        server_time: now, facility_name: 'Waiting for the hub', relay: true, hub_age_s: null,
        thresholds: {}, zones: [], residents: [], doors: [], alerts_recent: [],
        alerts_active: [this.hubAlert(now, 'The hub has not reached the relay yet. Is it online?')],
        counts: { residents: 0, critical: 0, warning: 1, stale_devices: 0, doors_open: 0, doors_offline: 0 },
      };
    }
    const s = structuredClone(this.summary);
    const age = (Date.now() - this.pushedAt) / 1000;
    s.server_time = (s.server_time || now) + age;
    s.relay = true;
    s.hub_age_s = Math.round(age * 10) / 10;
    let stale = 0, offline = 0;
    for (const r of s.residents || []) {
      if (r.seconds_since_seen != null) r.seconds_since_seen = Math.round(r.seconds_since_seen + age);
      if (r.seconds_in_zone != null) r.seconds_in_zone = Math.round(r.seconds_in_zone + age);
      if (r.seconds_since_seen != null) r.stale = r.seconds_since_seen > (r.stale_threshold_s || 30);
      if (r.stale) stale++;
    }
    for (const d of s.doors || []) {
      if (d.seconds_since_seen != null) d.seconds_since_seen = Math.round(d.seconds_since_seen + age);
      if (d.seconds_since_seen != null) d.offline = d.seconds_since_seen > (d.stale_threshold_s || 90);
      if (d.offline) offline++;
    }
    // acknowledged here, not yet confirmed by the hub: show it done already
    for (const [id, a] of this.pendingAcks) {
      s.alerts_active = (s.alerts_active || []).filter(x => x.id !== id);
      for (const x of s.alerts_recent || []) if (x.id === id && !x.acknowledged_at) {
        x.acknowledged_at = a.at; x.acknowledged_by = a.by;
      }
    }
    if (age > STALE_PUSH_S) {
      s.alerts_active = [this.hubAlert(now, `No update from the hub for ${Math.round(age)} s - data shown is the last received.`),
        ...(s.alerts_active || [])];
    }
    s.counts = {
      ...(s.counts || {}),
      stale_devices: stale, doors_offline: offline,
      critical: (s.alerts_active || []).filter(a => a.severity === 'critical').length,
      warning: (s.alerts_active || []).filter(a => a.severity === 'warning').length,
    };
    return s;
  }

  hubAlert(now, detail) {
    return { id: -1, source: 'relay', type: 'hub_offline', label: 'Hub not reporting to the relay',
      severity: 'warning', detail, event_at: now, received_at: now, delayed: false };
  }

  async ack(id, request) {
    if (id < 0) return json({ ok: true, note: 'relay status, nothing to acknowledge' });
    const known = [...(this.summary?.alerts_active || []), ...(this.summary?.alerts_recent || [])].find(a => a.id === id);
    if (!known) return json({ detail: 'alert not found' }, 404);
    if (known.acknowledged_at) return json({ ok: true, already: true, alert_id: id, acknowledged_by: known.acknowledged_by });
    let by = 'caregiver';
    try { by = String((await request.json()).acked_by || by).slice(0, 30); } catch (e) { /* default */ }
    const rec = { id, by: `${by} (remote)`, at: Date.now() / 1000 };
    if (!this.pendingAcks.has(id)) { this.pendingAcks.set(id, rec); await this.save(false); }
    return json({ ok: true, alert_id: id, acknowledged_by: rec.by, acknowledged_at: rec.at, pending: true });
  }

  // ----------------------------------------------------------- passcode
  async authed(request) {
    const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)trodes_session=([0-9]+)\.([0-9a-f]{64})/);
    if (!m || !this.env.SESSION_KEY) return false;
    const issued = Number(m[1]);
    if (!(Date.now() / 1000 - issued < SESSION_S)) return false;
    return same(await hmacHex(this.env.SESSION_KEY, m[1]), m[2]);
  }

  async login(request) {
    const t = Date.now() / 1000;
    if (t < this.lockedUntil) return json({ ok: false, locked_for: Math.ceil(this.lockedUntil - t) }, 429);
    let code = '';
    try { code = String((await request.json()).passcode || '').trim(); } catch (e) { /* empty */ }
    if (this.passcode() && same(code, this.passcode())) {
      this.failures = [];
      const issued = String(Math.floor(t));
      const cookie = `trodes_session=${issued}.${await hmacHex(this.env.SESSION_KEY, issued)}; Max-Age=${SESSION_S}; Path=/; Secure; HttpOnly; SameSite=Lax`;
      return json({ ok: true }, 200, { 'Set-Cookie': cookie });
    }
    this.failures = this.failures.filter(f => t - f < LOCK_WINDOW_S).concat(t);
    if (this.failures.length >= LOCK_AFTER) {
      this.failures = [];
      this.lockedUntil = t + LOCK_FOR_S;
      return json({ ok: false, locked_for: LOCK_FOR_S }, 429);
    }
    return json({ ok: false, tries_left: LOCK_AFTER - this.failures.length }, 401);
  }
}
