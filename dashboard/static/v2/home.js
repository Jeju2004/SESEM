/* TroDes caregiver dashboard - "home" layout (v2).
 *
 * Presentation only: it reads the same /api/v1/summary as the original page
 * (/static/app.js) every 2 s and keeps the same safety rules:
 *   - elapsed times use the SERVER clock (offset measured on every poll);
 *   - a failed poll keeps the last data but marks everything as not live;
 *   - the most severe unacknowledged alert sits on top and cannot scroll away;
 *   - a quiet wearable shows "Not reporting", a quiet door node "Offline"
 *     (never "Closed"), and a missing heart rate or battery shows an em dash,
 *     never 0.
 *
 * Passcode: if the server has one (TRODES_PASSCODE, see app/auth.py) the page
 * starts on a lock screen and polls nothing until the code is accepted; a 401
 * later (session expired, server restarted) locks it again.
 * Theme: follows the phone's light / dark setting live; the button overrides
 * it until the phone's setting next changes ('trodes.themeOverride').
 */
'use strict';

const POLL_MS = 1000;   // was 2000: zone and door changes show up faster
const API = '/api/v1';

let state = null;
let clockOffset = 0;
let lastPollOk = false;
let lastPollAt = 0;
let tab = 'home';
let pollTimer = null;
let tickTimer = null;
let codeLen = 4;
let code = '';
let busy = false;

/* ------------------------------------------------------------------ utils */
const $ = id => document.getElementById(id);
const serverNow = () => Date.now() / 1000 + clockOffset;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function duration(seconds) {
  if (seconds == null || !isFinite(seconds)) return '--';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}
function clockTime(epoch) {
  if (!epoch) return '--';
  return new Date(epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
/* seconds_* fields are as of state.server_time; keep them moving between polls */
const since = v => v == null ? null : v + (serverNow() - state.server_time);

const ICON = {
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
  batt: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4"/></svg>',
  signal: '<svg viewBox="0 0 24 24"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};

/* ------------------------------------------------------------------ theme */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0e1219' : '#f5f7fc');
  document.querySelectorAll('[data-theme-toggle]').forEach(b => {
    b.innerHTML = t === 'dark' ? ICON.sun : ICON.moon;
    b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  });
}
/* The phone's light/dark setting decides. The button is an override for this
 * phone, and it lasts only until the phone's own setting changes (sunset
 * auto-dark, Control Centre): then the page follows the phone again. Pressing
 * the button back to the phone's own theme also clears the override. */
const THEME_KEY = 'trodes.themeOverride';
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const sysTheme = () => sysDark.matches ? 'dark' : 'light';
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try { if (t === sysTheme()) localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch (e) {}
  applyTheme(t);
}
function followSystem() {
  try { localStorage.removeItem(THEME_KEY); } catch (e) {}
  applyTheme(sysTheme());
}
if (sysDark.addEventListener) sysDark.addEventListener('change', followSystem);
else if (sysDark.addListener) sysDark.addListener(followSystem);   // Safari 13 and older
applyTheme(document.documentElement.getAttribute('data-theme') || sysTheme());

/* ------------------------------------------------------------- caregiver */
try { const n = localStorage.getItem('trodes.caregiver'); if (n) $('caregiver').value = n; } catch (e) {}
$('caregiver').addEventListener('input', e => {       // saved as typed, not only on leaving the box
  try { localStorage.setItem('trodes.caregiver', e.target.value); } catch (err) {}
  renderHello();
});
/* iPhone (30 Sep): the "sign in to network" window focuses the first text box
 * on the page by itself, so the keyboard kept popping up and AutoFill kept
 * asking for a contact name. The box is now read-only (no keyboard, no
 * AutoFill) until it is actually tapped, and goes back to read-only on
 * Done/Enter, on a tap anywhere else, or when it loses focus. The earlier
 * release-on-scroll is gone: opening the keyboard scrolls the page, which
 * closed the box at once and made the keyboard flicker. */
const nameBox = $('caregiver');
// Unlock the moment the finger lands, BEFORE iOS decides whether this tap opens
// the keyboard: iOS then focuses an editable box itself and the keyboard comes
// up on the first tap. (Unlocking in 'click' was too late - it took two taps.)
const unlockName = () => { nameBox.readOnly = false; };
const releaseName = () => {
  nameBox.readOnly = true;
  if (document.activeElement === nameBox) nameBox.blur();
};
nameBox.addEventListener('touchstart', unlockName, { passive: true });
nameBox.addEventListener('mousedown', unlockName);
nameBox.addEventListener('click', () => { nameBox.readOnly = false; if (document.activeElement !== nameBox) nameBox.focus(); });
nameBox.addEventListener('blur', () => { nameBox.readOnly = true; });
nameBox.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); releaseName(); } });
document.addEventListener('touchstart', e => { if (e.target !== nameBox) releaseName(); }, { passive: true });
document.addEventListener('mousedown', e => { if (e.target !== nameBox) releaseName(); });
const caregiverName = () => ($('caregiver').value || '').trim() || 'caregiver';

/* ------------------------------------------------------------------ fetch */
async function poll() {
  try {
    const t0 = Date.now();
    const res = await fetch(API + '/summary', { cache: 'no-store' });
    if (res.status === 401) { lockScreen('Session ended - enter passcode'); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    clockOffset = data.server_time - (Date.now() + t0) / 2000;
    state = data; lastPollOk = true; lastPollAt = Date.now();
  } catch (err) {
    lastPollOk = false;
  }
  render();
}

/* ----------------------------------------------------------------- header */
function renderHello() {
  const hour = new Date(serverNow() * 1000).getHours();
  $('greet').textContent = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  const name = ($('caregiver').value || '').trim();
  $('avatar').textContent = name ? name.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('') : '?';
  const n = state ? (state.alerts_active || []).length : 0;
  for (const el of [$('bell-dot'), $('tab-badge')]) {
    el.textContent = n > 9 ? '9+' : n;
    el.classList.toggle('on', n > 0);
  }
  const live = $('live');
  live.classList.toggle('down', !lastPollOk);
  $('live-text').textContent = lastPollOk ? 'Live'
    : lastPollAt ? 'No connection · ' + duration((Date.now() - lastPollAt) / 1000) : 'Connecting…';
  if (state) $('facility').textContent = state.facility_name;
}

/* ------------------------------------------------------------------ alarm */
/* An unacknowledged SOS sounds an alarm on every open dashboard, vibrates the
 * phone and flashes the tab title, until a caregiver acknowledges it or taps
 * "hide for now". Phones let a page make sound only after a tap on it, so the
 * first tap anywhere (the passcode keypad counts) arms it. An <audio> element,
 * not Web Audio: on an iPhone it still plays with the silent switch on. */
function alarmWav() {
  const rate = 8000, parts = [[880, .16], [0, .08], [660, .16], [0, .08], [880, .16], [0, .6]];
  const n = parts.reduce((t, p) => t + Math.round(p[1] * rate), 0);
  const v = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  let o = 44;
  for (const [f, d] of parts) {
    for (let i = 0; i < Math.round(d * rate); i++, o += 2)
      v.setInt16(o, f ? Math.round(Math.sin(2 * Math.PI * f * i / rate) * 14000) : 0, true);
  }
  return URL.createObjectURL(new Blob([v.buffer], { type: 'audio/wav' }));
}
const siren = new Audio(alarmWav());
siren.loop = true;
let soundArmed = false;
function armSound() {
  if (soundArmed) return;
  siren.muted = true;
  siren.play().then(() => { siren.pause(); siren.currentTime = 0; siren.muted = false; soundArmed = true; renderBanner(); })
    .catch(() => { /* not allowed yet - the next tap tries again */ });
}
document.addEventListener('pointerdown', armSound, { passive: true });
document.addEventListener('keydown', armSound);

const baseTitle = document.title;
let lastBuzz = 0;
function alarm(sos) {                       // sos: the top unacknowledged SOS, or null
  const on = !!sos && !collapsed;
  if (on && soundArmed && siren.paused) siren.play().catch(() => {});
  if (!on && !siren.paused) { siren.pause(); siren.currentTime = 0; }
  if (on && navigator.vibrate && Date.now() - lastBuzz > 3000) {
    lastBuzz = Date.now();
    try { navigator.vibrate([300, 150, 300]); } catch (e) { /* not supported - fine */ }
  }
  document.title = sos && Math.floor(Date.now() / 1000) % 2 ? 'SOS: ' + (sos.detail || 'help needed') : baseTitle;
}

/* ----------------------------------------------------------- notification */
/* The most severe unacknowledged alert floats over the page. It is rebuilt only
 * when the alerts change - between polls just its "x ago" text is updated, so
 * the slide-in plays once per NEW alert, not every second. Tucked away, it
 * becomes a pulsing pill; a new alert id brings the full card back by itself. */
let seenIds = new Set();
let collapsed = false;
let bannerKey = '';
let bannerFresh = false;

function renderBanner() {
  const host = $('banner');
  const active = state ? state.alerts_active || [] : [];
  if (!active.length) { host.innerHTML = ''; bannerKey = ''; collapsed = false; seenIds = new Set(); alarm(null); return; }
  const fresh = active.filter(x => !seenIds.has(x.id));
  seenIds = new Set(active.map(x => x.id));
  if (fresh.length) {
    collapsed = false; bannerFresh = true;
    if (fresh.some(x => x.severity === 'critical') && navigator.vibrate) {
      try { navigator.vibrate([220, 120, 220]); } catch (e) { /* not supported - fine */ }
    }
  }
  alarm(active.find(x => x.type === 'sos') || null);
  const a = active[0];                      // server sorts by severity, then recency
  const sev = a.severity === 'critical' ? '' : 'warning';
  // An SOS carries its urgency in the message (1, 2 or 3 presses): that is the headline.
  const isSos = a.type === 'sos' && a.detail;
  const title = isSos ? 'SOS: ' + a.detail : a.label;
  const meta = `${isSos ? '' : esc(a.detail || '') + ' — '}${duration(serverNow() - a.event_at)} ago, ${clockTime(a.event_at)}${a.delayed ? ' · delivered late' : ''}`;
  const hint = a.type === 'sos' && !soundArmed ? '<div class="ac-meta"><b>Tap anywhere to turn on the alarm sound.</b></div>' : '';
  const key = `${a.id}|${active.length}|${collapsed}|${soundArmed}`;
  if (key === bannerKey && !bannerFresh) {
    const m = host.querySelector('.ac-meta');
    if (m) m.innerHTML = meta;
    return;
  }
  bannerKey = key;
  const who = a.resident || a.node_id || '';
  const where = a.zone_name || '';
  const more = active.length > 1 ? ` · +${active.length - 1}` : '';
  host.innerHTML = collapsed
    ? `<button type="button" class="alert-pill ${sev}" data-expand aria-label="Show alert"><i></i><span>${esc(title)}${esc(more)}</span>${ICON.down}</button>`
    : `<div class="alert-card ${sev} ${bannerFresh ? 'enter' : ''}" role="alert">
        <div class="ac-top">
          <div>
            <div class="ac-type">${ICON.warn}${esc(title)}</div>
            <div class="ac-who">${esc(who)}${where ? ' · ' + esc(where) : ''}</div>
            <div class="ac-meta">${meta}</div>${hint}
          </div>
          <button type="button" class="ac-hide" data-collapse aria-label="Hide for now">${ICON.up}</button>
        </div>
        <div class="ac-actions">
          <button type="button" data-ack="${a.id}">Acknowledge</button>
          ${active.length > 1 ? `<button type="button" class="ghost" id="ack-all">All ${active.length}</button>` : ''}
        </div>
      </div>`;
  bannerFresh = false;
}

/* ------------------------------------------------------------------ tiles */
function renderHero() {
  const host = $('hero');
  const r = state && state.residents && state.residents[0];
  if (!r) { host.className = 'tile hero stale'; host.innerHTML = '<div class="hero-name">No resident configured</div>'; return; }
  const stale = r.stale || !lastPollOk || r.never_seen;
  const zc = r.zone.class;
  host.className = 'tile hero ' + (r.sos ? 'sos' : stale ? 'stale' : zc === 'restricted' ? 'restricted' : '');
  const b = r.battery;
  const batt = b.pct == null ? '—' : b.pct + '%';
  const pill = r.sos ? 'SOS' : stale ? 'NOT REPORTING' : zc === 'restricted' ? 'RESTRICTED' : zc === 'safe' ? 'SAFE' : 'LOCATING';
  const sub = r.never_seen ? 'Never reported'
    : stale ? 'Last seen ' + duration(since(r.seconds_since_seen)) + ' ago'
    : r.seconds_in_zone == null ? 'Zone unknown' : 'Here for ' + duration(since(r.seconds_in_zone));
  host.innerHTML = `
    <div class="hero-name">${esc(r.name)}</div>
    <div class="hero-batt ${b.level}">${ICON.batt}<span>${batt}</span></div>
    <div class="hero-zone">${esc(r.zone.name)}</div>
    <div class="hero-sub">${sub}</div>
    <span class="hero-pill">${pill}</span>
    <svg class="radar" viewBox="0 0 170 170">
      <circle cx="85" cy="85" r="80"/><circle cx="85" cy="85" r="56"/><circle cx="85" cy="85" r="32"/>
      <circle class="ring-anim" cx="85" cy="85" r="80"/><circle class="core" cx="85" cy="85" r="11"/>
    </svg>`;
}

function renderDoorTile() {
  const host = $('door-tile');
  const d = state && state.doors && state.doors[0];
  if (!d) { host.className = 'tile small none'; host.innerHTML = '<div class="t">Doors</div><div class="s">None configured</div>'; return; }
  const cls = d.offline || d.never_seen ? 'offline' : d.state === 'open' ? 'open' : '';
  const s = d.never_seen ? 'Never reported' : d.offline ? 'Offline · last ' + esc(d.state || '?')
    : d.state === 'open' ? 'OPEN' : d.state === 'closed' ? 'Closed' : 'Unknown';
  host.className = 'tile small ' + cls;
  host.innerHTML = `<div class="t">${esc(d.name)}</div><div class="s">${s}</div>
    <span class="ico">${cls === 'offline' ? ICON.alert : d.state === 'open' ? ICON.unlock : ICON.lock}</span>`;
}

function renderHrTile() {
  const host = $('hr-tile');
  const r = state && state.residents && state.residents[0];
  const hr = r && !(r.stale || !lastPollOk) ? r.hr_bpm : null;
  host.className = 'tile small ' + (hr == null ? 'none' : '');
  host.innerHTML = hr == null
    ? `<div class="t">Heart rate</div><div class="s">— · place finger</div><span class="ico">${ICON.heart}</span>`
    : `<div class="t">Heart rate</div><div class="s"><span class="big">${hr}</span> bpm</div><span class="ico">${ICON.heart}</span>`;
}

/* -------------------------------------------------------------- floor plan */
function renderPlan() {
  const svg = $('plan');
  if (!state) return;
  const zones = state.zones || [];
  const r = state.residents && state.residents[0];
  const here = r && !r.never_seen ? r.zone.key : null;
  const W = 320, H = 190, M = 6, G = 8;
  // first safe zone on the left, the rest stacked on the right (restricted on top)
  const left = zones.find(z => z['class'] === 'safe') || zones[0];
  const rest = zones.filter(z => z !== left).sort((a, b) => (a['class'] === 'restricted' ? -1 : 1) - (b['class'] === 'restricted' ? -1 : 1));
  const boxes = {};
  const lw = rest.length ? Math.round((W - 2 * M - G) * 0.47) : W - 2 * M;
  if (left) boxes[left.key] = { x: M, y: M, w: lw, h: H - 2 * M, z: left };
  const rh = rest.length ? (H - 2 * M - G * (rest.length - 1)) / rest.length : 0;
  rest.forEach((z, i) => { boxes[z.key] = { x: M + lw + G, y: M + i * (rh + G), w: W - 2 * M - lw - G, h: rh, z }; });

  let out = '';
  for (const k in boxes) {
    const b = boxes[k];
    out += `<rect class="room ${b.z['class']} ${k === here ? 'here' : ''}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12"/>
      <text class="rname" x="${b.x + 11}" y="${b.y + 20}">${esc(b.z.name)}</text>
      <text class="rtag ${b.z['class']}" x="${b.x + 11}" y="${b.y + 34}">${b.z['class'] === 'restricted' ? 'RESTRICTED' : 'SAFE'}</text>`;
  }
  // door nodes: on the left wall of their zone (towards the corridor)
  for (const d of state.doors || []) {
    const b = boxes[d.key]; if (!b) continue;
    const x = b.x, y0 = b.y + b.h / 2 - 11, y1 = b.y + b.h / 2 + 11;
    const st = d.offline || d.never_seen ? 'offline' : d.state === 'open' ? 'open' : 'closed';
    out += `<line class="door-gap" x1="${x}" y1="${y0 - 2}" x2="${x}" y2="${y1 + 2}"/>`;
    out += st === 'open'
      ? `<line class="door-line open" x1="${x}" y1="${y0}" x2="${x + 17}" y2="${y0 + 12}"/>`
      : `<line class="door-line ${st}" x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/>`;
  }
  // the resident: centre of the current zone, or in the corridor when unknown
  if (r && !r.never_seen) {
    const b = boxes[here];
    const cx = b ? b.x + b.w / 2 : M + lw + G / 2, cy = b ? b.y + b.h / 2 + 12 : H / 2;
    const rc = b && b.z['class'] === 'restricted' ? 'restricted' : '';
    const stale = r.stale || !lastPollOk;
    out += stale
      ? `<circle class="me stale" cx="${cx}" cy="${cy}" r="8"/>`
      : `<circle class="me-halo ${rc}" cx="${cx}" cy="${cy}" r="8"/><circle class="me ${rc}" cx="${cx}" cy="${cy}" r="8"/>`;
  }
  svg.innerHTML = out;

  const chips = [];
  if (r) {
    chips.push(`<span class="chip">${ICON.signal}<b>${r.rssi == null ? '—' : r.rssi}</b>${r.rssi == null ? '' : 'dBm'}</span>`);
    chips.push(`<span class="chip">${ICON.clock}${r.never_seen ? 'never seen' : 'seen <b>' + duration(since(r.seconds_since_seen)) + '</b> ago'}</span>`);
    if (r.battery.volts) chips.push(`<span class="chip">${ICON.batt}<b>${r.battery.volts.toFixed(2)}</b>V</span>`);
  }
  $('map-chips').innerHTML = chips.join('');
}

function renderZones() {
  if (!state) return;
  const rs = state.residents || [];
  $('zones').innerHTML = (state.zones || []).map(z => {
    const inside = rs.filter(r => !r.never_seen && r.zone.key === z.key);
    return `<div class="zone ${z['class']} ${inside.length ? 'occupied' : ''}">
      <div class="zn">${esc(z.name)}</div>
      <div class="zs">${inside.length ? esc(inside.map(r => r.name).join(', ')) : 'Empty'}</div>
      <span class="ztag ${z['class']}">${z['class'] === 'restricted' ? 'Restricted' : 'Safe'}</span>
      <span class="zi">${inside.length ? ICON.eye : ICON.shield}</span>
    </div>`;
  }).join('');
}

/* ------------------------------------------------------ alerts & activity */
function row(a, withAck) {
  const key = (withAck ? 'act-' : 'rec-') + a.id;      // lets render() find the same row again
  const bits = [duration(serverNow() - a.event_at) + ' ago', clockTime(a.event_at)];
  if (a.resident) bits.unshift(esc(a.resident));
  if (a.zone_name) bits.push(esc(a.zone_name));
  if (a.delayed) bits.push('<span class="late">delivered late</span>');
  if (a.acknowledged_at) bits.push(`<span class="ok">ack'd by ${esc(a.acknowledged_by)}</span>`);
  if (a.cleared_at) bits.push(`<span class="ok">cleared: ${esc(a.cleared_reason || '')}</span>`);
  return `<div class="row ${a.severity}" data-key="${key}"><div class="rm">
      <div class="rt">${esc(a.label)}${a.detail ? ' — ' + esc(a.detail) : ''}</div>
      <div class="rs">${bits.join(' · ')}</div></div>
      ${withAck ? `<button type="button" data-ack="${a.id}">Acknowledge</button>` : ''}</div>`;
}
// Rewrite a list only when its markup actually changed: most seconds nothing
// did, and skipping the rebuild keeps the page still (and cheap on a phone).
function setHTML(el, html) {
  if (el._html === html) return;
  el._html = html;
  el.innerHTML = html;
}
function renderLists() {
  if (!state) return;
  const act = state.alerts_active || [];
  setHTML($('alerts'), act.length ? act.map(a => row(a, true)).join('') : '<div class="empty">No active alerts. Nothing needs acknowledging.</div>');
  const rec = state.alerts_recent || [];
  setHTML($('recent'), rec.length ? rec.map(a => row(a, false)).join('') : '<div class="empty">Nothing recorded yet.</div>');
  setHTML($('doors'), (state.doors || []).map(d => {
    const st = d.never_seen ? 'offline' : d.offline ? 'offline' : d.state === 'open' ? 'open' : 'closed';
    const txt = d.never_seen ? 'NO DATA' : d.offline ? 'OFFLINE' : d.state === 'open' ? 'OPEN' : 'Closed';
    const sub = d.never_seen ? 'Never reported' : d.offline
      ? `No heartbeat for ${duration(d.seconds_since_seen)} — last known: ${esc(d.state)}`
      : `Heartbeat ${duration(d.seconds_since_seen)} ago`;
    return `<div class="row" data-key="door-${esc(d.node_id)}"><div class="rm"><div class="rt">${esc(d.name)}</div><div class="rs">${esc(d.node_id)} · ${sub}</div></div>
      <span class="door-state ${st}">${txt}</span></div>`;
  }).join('') || '<div class="empty">No door nodes configured.</div>');
}

/* ------------------------------------------------------------------- acks */
async function ack(id) {
  try {
    await fetch(`${API}/alerts/${id}/ack`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acked_by: caregiverName() }) });
  } catch (err) { $('live-text').textContent = 'Could not acknowledge - no connection'; return; }
  poll();
}
async function ackAll() {
  for (const a of (state && state.alerts_active) || []) {
    try {
      await fetch(`${API}/alerts/${a.id}/ack`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acked_by: caregiverName() }) });
    } catch (err) { /* the next poll shows what stuck */ }
  }
  poll();
}

/* ------------------------------------------------------------------- tabs */
function setTab(t) {
  tab = t;
  for (const s of ['home', 'alerts', 'activity']) $('tab-' + s).hidden = s !== t;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  releaseHeight();
  window.scrollTo({ top: 0 });
}
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-theme-toggle]')) { toggleTheme(); return; }
  const k = ev.target.closest('[data-k]');
  if (k) { keypad(k.dataset.k); return; }
  if (ev.target.closest('#lock-btn')) { logout(); return; }
  if (ev.target.closest('[data-collapse]')) { collapsed = true; bannerKey = ''; renderBanner(); return; }
  if (ev.target.closest('[data-expand]')) { collapsed = false; bannerKey = ''; renderBanner(); return; }
  const a = ev.target.closest('[data-ack]');
  if (a) { ack(Number(a.dataset.ack)); return; }
  if (ev.target.closest('#ack-all')) { ackAll(); return; }
  const t = ev.target.closest('.tabs button');
  if (t) { setTab(t.dataset.tab); return; }
  if (ev.target.closest('#bell')) setTab('alerts');
});

/* ------------------------------------------------------------------- loop */
/* Safari (iPhone) has no CSS scroll anchoring. Every poll rebuilds the lists,
 * so a new alert added above what you were reading pushed everything down and
 * looked like the page scrolled up by itself (30 Sep). Before each render, note
 * where the first visible row (or card) sits; afterwards, scroll by however far
 * it moved. At the very top nothing is held, so new alerts come into view. */
function scrollAnchor() {
  if (window.scrollY < 8) return null;
  let best = null;
  for (const el of document.querySelectorAll('main [data-key], main [id]')) {
    if (el.offsetParent === null) continue;             // on a hidden tab
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight) continue;
    const isRow = !!el.dataset.key;
    if (!best || (isRow && !best.isRow) || (isRow === best.isRow && top < best.top)) {
      best = { sel: isRow ? `[data-key="${el.dataset.key}"]` : '#' + el.id, top, isRow };
    }
  }
  return best;
}
function holdAnchor(a) {
  if (!a) return;
  const el = document.querySelector('main ' + a.sel);
  if (!el) return;                                       // that row went away (acknowledged)
  const moved = el.getBoundingClientRect().top - a.top;
  if (Math.abs(moved) >= 1) window.scrollBy(0, moved);
}

/* Page updates also wait while a finger is on the screen or the page is still
 * moving (iOS momentum scrolling and the bounce at the end): rebuilding the
 * lists under a moving page is what threw it back up from the bottom (30 Sep).
 * The update runs as soon as the page settles. Near the bottom the page is not
 * allowed to get shorter during an update either (it would be pulled up by
 * the difference); that hold is dropped once you scroll up or change tab.
 * The header and the floating alert banner never move the page, so they
 * always update at once - an SOS still shows immediately. */
const SETTLE_MS = 450;
let touching = false, scrollingUntil = 0, renderTimer = 0;
const mainEl = document.querySelector('main');
const nearBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 48;
function releaseHeight() { mainEl.style.minHeight = ''; }
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, Math.max(60, scrollingUntil - Date.now() + 30));
}
document.addEventListener('touchstart', () => { touching = true; }, { passive: true });
document.addEventListener('touchend', () => { touching = false; scrollingUntil = Date.now() + SETTLE_MS; scheduleRender(); }, { passive: true });
document.addEventListener('touchcancel', () => { touching = false; scheduleRender(); }, { passive: true });
window.addEventListener('scroll', () => {
  scrollingUntil = Date.now() + SETTLE_MS;
  if (mainEl.style.minHeight && !nearBottom()) releaseHeight();
}, { passive: true });

function render() {
  renderHello(); renderBanner();
  if (!state) return;
  if (touching || Date.now() < scrollingUntil) { scheduleRender(); return; }
  if (nearBottom() && window.scrollY > 0) mainEl.style.minHeight = mainEl.offsetHeight + 'px';
  const anchor = scrollAnchor();
  renderHero(); renderDoorTile(); renderHrTile(); renderPlan(); renderZones(); renderLists();
  holdAnchor(anchor);
}
/* ---------------------------------------------------------------- passcode */
function drawDots(extra) {
  $('dots').className = 'dots' + (extra ? ' ' + extra : '');
  $('dots').innerHTML = Array.from({ length: codeLen }, (_, i) => `<i class="${i < code.length ? 'on' : ''}"></i>`).join('');
}
function lockScreen(msg) {
  clearInterval(pollTimer); clearInterval(tickTimer); pollTimer = tickTimer = null;
  state = null; code = '';
  alarm(null);
  document.body.classList.add('locked');
  $('lock-msg').textContent = msg || 'Enter passcode';
  $('lock-msg').className = '';
  drawDots();
}
function startApp() {
  document.body.classList.remove('locked');
  if (pollTimer) return;
  poll();
  pollTimer = setInterval(poll, POLL_MS);
  tickTimer = setInterval(() => { if (state) { renderHello(); renderBanner(); renderHero(); } }, 1000);
}
async function submitCode() {
  busy = true;
  let res = null;
  try {
    res = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: code }) });
  } catch (err) { /* handled below */ }
  const body = res ? await res.json().catch(() => ({})) : {};
  busy = false;
  if (res && res.ok) { code = ''; startApp(); return; }
  code = '';
  const msg = $('lock-msg');
  msg.className = 'err';
  msg.textContent = !res ? 'Cannot reach the server'
    : res.status === 429 ? `Too many tries - wait ${body.locked_for || 60} s`
    : body.tries_left ? `Wrong passcode - ${body.tries_left} ${body.tries_left === 1 ? 'try' : 'tries'} left` : 'Wrong passcode';
  drawDots('shake');
  setTimeout(() => drawDots(), 450);
}
function keypad(k) {
  if (busy) return;
  if (k === 'del') code = code.slice(0, -1);
  else if (k === 'clear') code = '';
  else if (/^\d$/.test(k) && code.length < codeLen) code += k;
  drawDots();
  if (code.length === codeLen) submitCode();
}
document.addEventListener('keydown', ev => {
  if (!document.body.classList.contains('locked')) return;
  if (/^\d$/.test(ev.key)) keypad(ev.key);
  else if (ev.key === 'Backspace') keypad('del');
  else if (ev.key === 'Escape') keypad('clear');
});
async function logout() {
  try { await fetch(API + '/auth/logout', { method: 'POST' }); } catch (e) {}
  lockScreen('Locked');
}
async function boot() {
  try {
    const st = await (await fetch(API + '/auth/status', { cache: 'no-store' })).json();
    codeLen = st.length || 4;
    $('lock-btn').classList.toggle('hidden', !st.required);
    if (st.required && !st.authenticated) { lockScreen(); return; }
  } catch (e) { /* older server without /auth: no passcode, just run */ }
  startApp();
}
boot();
