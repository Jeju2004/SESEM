/* TroDes caregiver dashboard - front end.
 *
 * Vanilla JS, no build step, no framework. It polls one endpoint
 * (/api/v1/summary) every 2 seconds and re-renders.
 *
 * Two things worth knowing before changing this file:
 *
 * 1. All elapsed times ("2m 14s in Dining Hall", "last seen 8s ago") are
 *    computed against the SERVER's clock, not the browser's. A caregiver's
 *    phone with a clock a few minutes out would otherwise show a healthy
 *    device as long dead, or a dead one as healthy. We measure the offset on
 *    every poll and correct for it.
 *
 * 2. When a poll fails, the last good data stays on screen but the header
 *    turns red and every card is treated as ageing. A dashboard that silently
 *    freezes on the last good frame is worse than one that says it is lost.
 */

'use strict';

const POLL_MS = 2000;
const API = '/api/v1';

let state = null;          // last successful /summary payload
let clockOffset = 0;       // serverTime - browserTime, in seconds
let lastPollOk = false;
let lastPollAt = 0;
let consecutiveFailures = 0;

/* ------------------------------------------------------------------ utils */

function serverNow() {
  return Date.now() / 1000 + clockOffset;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/** "4h 12m", "2m 14s", "8s" - compact enough to read while walking past. */
function duration(seconds) {
  if (seconds == null || !isFinite(seconds)) return '--';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), rs = s % 60;
  if (m < 60) return m + 'm ' + rs + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

function clockTime(epoch) {
  if (!epoch) return '--';
  const d = new Date(epoch * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function caregiverName() {
  const el = document.getElementById('caregiver');
  return (el.value || '').trim() || 'caregiver';
}

/* Remember who is on duty between refreshes. Wrapped because private-mode
 * browsers throw on access rather than returning null. */
try {
  const saved = localStorage.getItem('trodes.caregiver');
  if (saved) document.getElementById('caregiver').value = saved;
} catch (e) { /* storage unavailable - not important enough to handle */ }

document.getElementById('caregiver').addEventListener('change', e => {
  try { localStorage.setItem('trodes.caregiver', e.target.value); } catch (err) {}
});

/* ------------------------------------------------------------------ fetch */

async function poll() {
  try {
    const t0 = Date.now();
    const res = await fetch(API + '/summary', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // Halve the round trip so the offset is not skewed by network latency.
    clockOffset = data.server_time - (Date.now() + t0) / 2000;
    state = data;
    lastPollOk = true;
    lastPollAt = Date.now();
    consecutiveFailures = 0;
  } catch (err) {
    lastPollOk = false;
    consecutiveFailures++;
  }
  render();
}

/* ----------------------------------------------------------------- header */

function renderHeader() {
  const conn = document.getElementById('conn');
  const text = document.getElementById('conn-text');

  if (lastPollOk) {
    conn.classList.remove('down');
    text.textContent = 'live · ' + clockTime(serverNow());
  } else {
    conn.classList.add('down');
    const age = lastPollAt ? Math.round((Date.now() - lastPollAt) / 1000) : null;
    text.textContent = age == null
      ? 'cannot reach server'
      : 'NO CONNECTION · data ' + duration(age) + ' old';
  }

  if (!state) return;
  document.getElementById('facility').textContent = state.facility_name;

  const c = state.counts;
  const items = [
    ['Residents', c.residents, ''],
    ['Critical', c.critical, c.critical > 0 ? 'hot' : ''],
    ['Warnings', c.warning, c.warning > 0 ? 'warn' : ''],
    ['Devices quiet', c.stale_devices, c.stale_devices > 0 ? 'warn' : ''],
    ['Doors open', c.doors_open, c.doors_open > 0 ? 'hot' : ''],
  ];
  if (c.doors_offline > 0) items.push(['Nodes offline', c.doors_offline, 'warn']);

  document.getElementById('counters').innerHTML = items.map(
    ([label, value, cls]) =>
      `<span class="counter ${cls}">${esc(label)} <b>${value}</b></span>`
  ).join('');
}

/* ----------------------------------------------------------------- banner */

/* The banner shows ONE alert at a time - the most severe, most recent - with
 * a count of the rest. Stacking five banners means none of them is read. */
function renderBanner() {
  const host = document.getElementById('banner');
  if (!state) { host.innerHTML = ''; return; }

  const active = state.alerts_active || [];
  if (active.length === 0) { host.innerHTML = ''; return; }

  const top = active[0];  // server already sorted by severity then recency
  const isCritical = top.severity === 'critical';
  const who = top.resident || top.node_id || '';
  const where = top.zone_name || top.detail || '';
  const ago = duration(serverNow() - top.event_at);

  let html = `
    <div class="alert-banner ${isCritical ? '' : 'warning'}">
      <div class="ab-type">${esc(top.label)}</div>
      <div class="ab-body">
        <div class="ab-who">${esc(who)}${where ? ' · ' + esc(where) : ''}</div>
        <div class="ab-meta">
          ${esc(top.detail || '')} &mdash; ${ago} ago, at ${clockTime(top.event_at)}
          ${top.delayed ? ' · <b>delivered late (device was offline)</b>' : ''}
        </div>
      </div>
      <button type="button" data-ack="${top.id}">Acknowledge</button>
    </div>`;

  if (active.length > 1) {
    html += `
      <div class="more-alerts">
        <span><b>${active.length - 1}</b> more unacknowledged alert${active.length > 2 ? 's' : ''}</span>
        <button type="button" id="ack-all">Acknowledge all ${active.length}</button>
      </div>`;
  }
  host.innerHTML = html;
}

/* -------------------------------------------------------------- residents */

function renderResidents() {
  const host = document.getElementById('residents');
  if (!state) return;

  const rs = state.residents || [];
  if (rs.length === 0) {
    host.innerHTML = '<div class="empty">No residents configured. '
      + 'Add them to config/zones.json.</div>';
    return;
  }

  host.innerHTML = rs.map(r => {
    const zc = r.zone.class;                       // safe | restricted | unknown
    const stale = r.stale || !lastPollOk;
    const cls = ['card', zc, stale ? 'stale' : '', r.sos ? 'sos' : ''].join(' ');

    const pill = r.sos
      ? '<span class="pill restricted">SOS</span>'
      : stale
        ? '<span class="pill offline">Not reporting</span>'
        : `<span class="pill ${zc}">${zc === 'restricted' ? 'Restricted'
            : zc === 'safe' ? 'Safe' : 'Unknown'}</span>`;

    const b = r.battery;
    const battClass = b.level === 'critical' ? 'critical'
      : b.level === 'low' ? 'low'
      : b.level === 'unknown' ? 'none' : '';
    const battText = b.pct == null ? '—' : b.pct + '%';
    const battBar = b.pct == null ? '' :
      `<div class="batt-bar"><i class="${battClass}" style="width:${b.pct}%"></i></div>`;

    // -1 from the firmware means no sensor or no finger. An em dash, never a
    // zero - a zero on a heart-rate field reads as a flatline.
    const hrText = r.hr_bpm == null ? '—' : r.hr_bpm;
    const hrClass = r.hr_bpm == null ? 'none' : '';

    const inZone = r.seconds_in_zone == null ? null
      : r.seconds_in_zone + (serverNow() - state.server_time);
    const sinceSeen = r.seconds_since_seen == null ? null
      : r.seconds_since_seen + (serverNow() - state.server_time);

    return `
      <article class="${cls}">
        <div class="card-head">
          <div>
            <div class="card-name">${esc(r.name)}</div>
            <div class="card-sub">${esc(r.device_id)}${r.room ? ' · ' + esc(r.room) : ''}</div>
          </div>
          ${pill}
        </div>

        <div>
          <div class="zone-name">${esc(r.zone.name)}</div>
          <div class="zone-time">
            ${r.never_seen ? 'Never reported'
              : inZone == null ? 'Zone unknown'
              : 'Here for ' + duration(inZone)}
          </div>
        </div>

        <div class="metrics">
          <div class="metric">
            <div class="label">Battery</div>
            <div class="value ${battClass}">${battText}
              ${b.volts ? `<small>${b.volts.toFixed(2)} V</small>` : ''}</div>
            ${battBar}
          </div>
          <div class="metric">
            <div class="label">Heart rate</div>
            <div class="value ${hrClass}">${hrText}
              ${r.hr_bpm == null ? '' : '<small>bpm</small>'}</div>
          </div>
          <div class="metric">
            <div class="label">Signal</div>
            <div class="value ${r.rssi == null ? 'none' : ''}">
              ${r.rssi == null ? '—' : r.rssi}
              ${r.rssi == null ? '' : '<small>dBm</small>'}</div>
          </div>
        </div>

        <div class="card-foot">
          <span>
            ${r.never_seen ? 'No contact since start-up'
              : 'Last seen ' + duration(sinceSeen) + ' ago'}
          </span>
          ${r.stale ? `<span class="stale-flag">⚠ Quiet &gt; ${r.stale_threshold_s}s</span>`
            : r.open_alerts > 0 ? `<span class="stale-flag">${r.open_alerts} open alert${r.open_alerts > 1 ? 's' : ''}</span>`
            : '<span>OK</span>'}
        </div>
      </article>`;
  }).join('');
}

/* ------------------------------------------------------------------ doors */

function renderDoors() {
  const host = document.getElementById('doors');
  if (!state) return;
  const doors = state.doors || [];
  if (doors.length === 0) {
    host.innerHTML = '<div class="empty">No door nodes configured.</div>';
    return;
  }

  host.innerHTML = doors.map(d => {
    // An offline node is a fault. It must never be drawn as "closed" just
    // because closed was the last thing it managed to report.
    const cls = d.offline ? 'offline' : (d.state === 'open' ? 'open' : '');
    const stateText = d.offline ? 'OFFLINE'
      : d.state === 'open' ? 'OPEN'
      : d.state === 'closed' ? 'Closed' : 'Unknown';
    const stateCls = d.offline ? 'unknown' : (d.state || 'unknown');

    const sub = d.never_seen
      ? 'Never reported'
      : d.offline
        ? `No heartbeat for ${duration(d.seconds_since_seen)} — last known: ${esc(d.state)}`
        : `Heartbeat ${duration(d.seconds_since_seen)} ago`;

    return `
      <div class="door-row ${cls}">
        <div class="dn">${esc(d.name)}<small>${esc(d.node_id)} · ${sub}</small></div>
        <div class="door-state ${stateCls}">${stateText}</div>
      </div>`;
  }).join('');
}

/* ----------------------------------------------------------------- alerts */

function alertRow(a, showAck) {
  const ago = duration(serverNow() - a.event_at);
  const bits = [`${ago} ago`, clockTime(a.event_at)];
  if (a.resident) bits.unshift(esc(a.resident));
  if (a.zone_name) bits.push(esc(a.zone_name));

  const flags = [];
  if (a.delayed) flags.push('<span class="delayed">delivered late</span>');
  if (a.acknowledged_at) {
    flags.push(`<span class="acked">acknowledged by ${esc(a.acknowledged_by)} `
      + `at ${clockTime(a.acknowledged_at)}</span>`);
  }
  if (a.cleared_at) {
    flags.push(`<span class="acked">cleared: ${esc(a.cleared_reason || '')}</span>`);
  }

  return `
    <div class="alert-row ${a.severity}">
      <div class="ar-main">
        <div class="ar-title">${esc(a.label)}${a.detail ? ' — ' + esc(a.detail) : ''}</div>
        <div class="ar-meta">${bits.join(' · ')}${flags.length ? ' · ' + flags.join(' · ') : ''}</div>
      </div>
      ${showAck ? `<button class="ack-btn" type="button" data-ack="${a.id}">Acknowledge</button>` : ''}
    </div>`;
}

function renderAlerts() {
  if (!state) return;

  const active = state.alerts_active || [];
  document.getElementById('alerts').innerHTML = active.length
    ? active.map(a => alertRow(a, true)).join('')
    : '<div class="empty">No active alerts. Nothing needs acknowledging.</div>';

  const recent = state.alerts_recent || [];
  document.getElementById('recent').innerHTML = recent.length
    ? recent.map(a => alertRow(a, false)).join('')
    : '<div class="empty">Nothing recorded yet.</div>';
}

/* ------------------------------------------------------------------- acks */

async function ack(id) {
  try {
    await fetch(`${API}/alerts/${id}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acked_by: caregiverName() })
    });
  } catch (err) {
    alertUser('Could not acknowledge - no connection to the server.');
    return;
  }
  poll();   // reflect it immediately rather than waiting for the next tick
}

async function ackAll() {
  const ids = (state.alerts_active || []).map(a => a.id);
  for (const id of ids) {
    try {
      await fetch(`${API}/alerts/${id}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acked_by: caregiverName() })
      });
    } catch (err) { /* keep going; the next poll shows what stuck */ }
  }
  poll();
}

/* A non-blocking notice. window.alert() would freeze the polling loop. */
function alertUser(msg) {
  const conn = document.getElementById('conn-text');
  const prev = conn.textContent;
  conn.textContent = msg;
  setTimeout(() => { conn.textContent = prev; }, 3000);
}

/* One delegated listener for every Acknowledge button, so re-rendering the
 * page twice a second never leaves a dead button behind. */
document.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-ack]');
  if (btn) { ack(Number(btn.getAttribute('data-ack'))); return; }
  if (ev.target.id === 'ack-all') ackAll();
});

/* ------------------------------------------------------------------ loop */

function render() {
  renderHeader();
  renderBanner();
  renderResidents();
  renderDoors();
  renderAlerts();
}

poll();
setInterval(poll, POLL_MS);
// Keep the "x ago" figures moving between polls so the page never looks frozen.
setInterval(() => { if (state) { renderHeader(); renderBanner(); } }, 1000);
