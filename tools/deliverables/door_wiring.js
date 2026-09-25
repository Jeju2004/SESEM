// Door sensor node — complete wiring diagram. Usage: node door_wiring.js <out.svg> [out.png]
// Pin names follow the team's ESP32 DevKitC 38-pin pinout (vault: Reference/ESP32 DevKitC Pinout).
const fs = require("fs");
const [, , OUT_SVG, OUT_PNG] = process.argv;
const W = 1500, H = 1320;
const C = { ink: "#1F2933", board: "#2C3E50", pinBg: "#F2F4F4", used: "#0E5E6F", gnd: "#111111", pwr: "#C0392B", sig: "#0E5E6F", muted: "#7F8C8D", accent: "#E4572E", wire: "#0E5E6F", note: "#5F6B73", term: "#2E86C1" };
const s = []; const add = (x) => s.push(x);
const text = (x, y, t, o = {}) => add(`<text x="${x}" y="${y}" font-family="Arial" font-size="${o.size || 14}" fill="${o.fill || C.ink}" font-weight="${o.bold ? "bold" : "normal"}" font-style="${o.italic ? "italic" : "normal"}" text-anchor="${o.anchor || "start"}">${t}</text>`);
const rect = (x, y, w, h, o = {}) => add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 8}" fill="${o.fill || "none"}" stroke="${o.stroke || "none"}" stroke-width="${o.sw || 2}" ${o.dash ? `stroke-dasharray="${o.dash}"` : ""}/>`);
const line = (pts, color, w = 4, dash) => add(`<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`);
const dot = (x, y, color, r = 6) => add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`);

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
add(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);
text(40, 52, "TroDes — Door Sensor Node: Complete Wiring", { size: 28, bold: true });
text(40, 82, "ESP32 DevKitC (38-pin) · reed switch on GPIO 18 · powered by a 5 V USB adapter · reports door events to the dashboard over WiFi", { size: 15, fill: C.note });

// ESP32 board
const bx = 330, by = 130, bw = 330, pitch = 38, top = by + 70;
const L = ["3V3", "EN", "SENSOR VP", "SENSOR VN", "G34", "G35", "G32", "G33", "G25", "G26", "G27", "G14", "G12", "GND", "G13", "SD2", "SD3", "CMD", "V5 (5V)"];
const R = ["GND", "G23", "G22", "TXD", "RXD", "G21", "GND", "G19", "G18", "G5", "G17", "G16", "G4", "G0", "G2", "G15", "SD1", "SD0", "CLK"];
const bh = 70 + 18 * pitch + 90;
rect(bx, by, bw, bh, { fill: C.board, rx: 26 });
rect(bx + 95, by + 14, 140, 44, { fill: "#566573", rx: 4 }); text(bx + 165, by + 42, "ANTENNA", { size: 13, bold: true, fill: "#D5D8DC", anchor: "middle" });
rect(bx + 105, by + 150, 120, 150, { fill: "#AAB7B8", rx: 6 }); text(bx + 165, by + 220, "ESP32", { size: 18, bold: true, fill: C.board, anchor: "middle" }); text(bx + 165, by + 242, "WROOM-32", { size: 13, fill: C.board, anchor: "middle" });
rect(bx + 125, by + bh - 34, 80, 44, { fill: "#BDC3C7", rx: 6 }); text(bx + 180, by + bh + 34, "USB", { size: 14, bold: true, anchor: "start" });
text(bx + 165, by + bh - 50, "ESP32 DevKitC", { size: 16, bold: true, fill: "#FFFFFF", anchor: "middle" });
const soldered = { L: [0, 18], R: [0, 6, 8, 18] };                 // corners + used pins (right GND pos 7, G18 pos 9)
const used = { R: { 6: C.gnd, 8: C.used } };
L.forEach((n, i) => {
  const y = top + i * pitch, x = bx + 18;
  add(`<circle cx="${x}" cy="${y}" r="10" fill="#D4AC0D" stroke="#7D6608" stroke-width="2"/>`);
  if (soldered.L.includes(i)) add(`<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#F39C12" stroke-width="3"/>`);
  text(bx - 12, y + 5, n, { size: 13, anchor: "end", fill: n.startsWith("GND") ? C.gnd : n.includes("3V3") || n.includes("V5") ? C.pwr : C.muted, bold: n === "GND" || n.includes("V5") || n === "3V3" });
});
R.forEach((n, i) => {
  const y = top + i * pitch, x = bx + bw - 18;
  const col = used.R[i];
  add(`<circle cx="${x}" cy="${y}" r="10" fill="${col || "#D4AC0D"}" stroke="${col ? col : "#7D6608"}" stroke-width="2"/>`);
  if (soldered.R.includes(i)) add(`<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#F39C12" stroke-width="3"/>`);
  text(bx + bw + 12, y + (col ? -10 : 5), n, { size: 13, fill: col ? col : n === "GND" ? C.gnd : C.muted, bold: !!col || n === "GND" });
});
text(bx + bw + 12, top + 14 * pitch + 20, "on-board LED (status)", { size: 11, italic: true, fill: C.note });

// wires to J1
const g18y = top + 8 * pitch, gndy = top + 6 * pitch, px = bx + bw - 18;
const jx = 900, j1y = g18y + 20, j2y = j1y + 70;
line([[px + 10, g18y], [770, g18y], [770, j1y], [jx, j1y]], C.sig, 5);
line([[px + 10, gndy], [800, gndy], [800, j2y], [jx, j2y]], C.gnd, 5);
text(740, g18y - 12, "link A", { size: 13, bold: true, fill: C.sig, anchor: "middle" });
text(740, gndy - 12, "link B", { size: 13, bold: true, fill: C.gnd, anchor: "middle" });
// J1 terminal
rect(jx, j1y - 30, 70, 130, { fill: "#D6EAF8", stroke: C.term, sw: 3 });
dot(jx + 35, j1y, C.sig, 9); dot(jx + 35, j2y, C.gnd, 9);
text(jx + 35, j1y - 42, "J1", { size: 16, bold: true, anchor: "middle" }); text(jx + 35, j2y + 58, "screw terminal", { size: 12, anchor: "middle", fill: C.note });
// cable to the reed switch
const rx = 1150;
line([[jx + 35, j1y], [rx, j1y]], C.sig, 3, "10 6");
line([[jx + 35, j2y], [rx - 10, j2y], [rx - 10, j1y + 110], [rx, j1y + 110]], C.gnd, 3, "10 6");
text(1045, j1y - 10, "reed lead", { size: 12, fill: C.note, anchor: "middle" });
// reed switch symbol (normally open, closes with the magnet)
const sx = rx, sy = j1y;
rect(sx - 10, sy - 50, 250, 210, { stroke: C.muted, dash: "8 6", rx: 12 });
text(sx + 115, sy - 60, "DOOR FRAME", { size: 13, bold: true, fill: C.muted, anchor: "middle" });
line([[sx, sy], [sx + 60, sy]], C.ink, 3); dot(sx + 60, sy, C.ink, 5);
line([[sx + 60, sy], [sx + 120, sy + 40]], C.ink, 3);
dot(sx + 125, sy + 110, C.ink, 5); line([[sx + 125, sy + 110], [sx, sy + 110]], C.ink, 3);
line([[sx + 125, sy + 110], [sx + 125, sy + 50]], C.ink, 3);
text(sx + 150, sy + 30, "S1", { size: 16, bold: true }); text(sx + 150, sy + 50, "reed switch", { size: 12, fill: C.note });
// magnet on the door
rect(sx + 30, sy + 200, 180, 70, { stroke: C.muted, dash: "8 6", rx: 12 });
text(sx + 120, sy + 290, "DOOR (moving leaf)", { size: 13, bold: true, fill: C.muted, anchor: "middle" });
rect(sx + 70, sy + 215, 50, 40, { fill: "#C0392B", rx: 4 }); rect(sx + 120, sy + 215, 50, 40, { fill: "#2E86C1", rx: 4 });
text(sx + 95, sy + 241, "N", { size: 16, bold: true, fill: "#FFF", anchor: "middle" }); text(sx + 145, sy + 241, "S", { size: 16, bold: true, fill: "#FFF", anchor: "middle" });
text(sx + 120, sy + 190, "magnet — within the reed's gap when closed", { size: 11, fill: C.note, anchor: "middle" });

// power
const uy = by + bh + 80;
line([[bx + 165, by + bh + 10], [bx + 165, uy]], C.pwr, 5);
rect(bx + 95, uy, 140, 60, { fill: "#FDEDEC", stroke: C.pwr, sw: 3 });
text(bx + 165, uy + 26, "5 V USB adapter", { size: 14, bold: true, anchor: "middle", fill: C.pwr }); text(bx + 165, uy + 46, "(≥ 1 A, mains)", { size: 12, anchor: "middle", fill: C.pwr });
text(bx + 250, uy + 36, "→ the only power input · no battery · no boost module", { size: 13, fill: C.note });

// behaviour / legend (left)
let ly = 170; const note = (t, o = {}) => { text(40, ly, t, { size: o.size || 14, bold: o.bold, fill: o.fill || C.ink }); ly += o.gap || 22; };
note("How it works", { bold: true, size: 17, gap: 28 });
note("G18 uses the ESP32's internal", { size: 13 }); note("pull-up — no resistor needed.", { size: 13, gap: 28 });
note("Door CLOSED", { bold: true, fill: C.sig }); note("magnet near → S1 closed", { size: 13 }); note("→ G18 = LOW", { size: 13, gap: 28 });
note("Door OPEN", { bold: true, fill: C.accent }); note("magnet away → S1 open", { size: 13 }); note("→ G18 = HIGH", { size: 13 }); note("→ door-opened alert", { size: 13, gap: 28 });
note("Heartbeat every 30 s:", { bold: true, size: 13 }); note("a silent node shows", { size: 13 }); note("OFFLINE on the dashboard", { size: 13, gap: 28 });
note("Orange rings = pins to", { bold: true, size: 13, fill: "#B9770E" }); note("solder on the perfboard", { size: 13, fill: "#B9770E" }); note("(G18, GND, 4 corners)", { size: 13, fill: "#B9770E", gap: 28 });
note("Perfboard (5×7 cm):", { bold: true, size: 13 }); note("G18 = col 11, row 12", { size: 13 }); note("GND = col 11, row 10", { size: 13 }); note("J1 = col 14, rows 12–14", { size: 13 });

// firmware box (right bottom)
rect(900, 1080, 560, 150, { fill: "#F4F6F7", stroke: C.muted, sw: 1.5 });
text(920, 1110, "Firmware — firmware/door_sensor", { size: 15, bold: true });
text(920, 1136, "PIN_REED 18 · REED_DEBOUNCE_MS 50 · HEARTBEAT_PERIOD_MS 30000", { size: 13, fill: C.note });
text(920, 1160, "DOOR_ID 11 · DOOR_NAME medicine_room · NODE_ID door-11", { size: 13, fill: C.note });
text(920, 1184, "WiFi + dashboard address in include/secrets.h (not in Git)", { size: 13, fill: C.note });
text(920, 1208, "POST /api/v1/door  {state_change | heartbeat | boot}", { size: 13, fill: C.note });
add(`</svg>`);
fs.writeFileSync(OUT_SVG, s.join("\n")); console.log("wrote", OUT_SVG);
if (OUT_PNG) require("sharp")(Buffer.from(s.join("\n"))).png().toFile(OUT_PNG).then(() => console.log("wrote", OUT_PNG));
