// Wearable perfboard placement map (6 x 8 cm board, landscape, 28 x 22 holes), devkit soldered directly.
// Usage: node perfboard_map.js <out.svg> [out.png]
// Coordinates are hole positions: x = column 0..27 (left→right), y = row 0..21 (top→bottom),
// viewed from the COMPONENT side. Devkit pin 1 (3V3) at (1,1); 38-pin DevKitC, rows 10 holes apart.
const fs = require("fs");
const [, , OUT_SVG, OUT_PNG] = process.argv;

const COLS = 28, ROWS = 22, P = 30, M = 70;            // pitch px, margin px
const W = M * 2 + (COLS - 1) * P + 380, H = M * 2 + (ROWS - 1) * P + 40;
const X = (c) => M + c * P, Y = (r) => M + r * P;
const C = { board: "#EAF4EC", hole: "#B7C4BA", dev: "#1F3864", pwr: "#C0392B", gnd: "#333333", sig: "#0E5E6F", i2c: "#2E86C1", keep: "#E4572E", part: "#6B4E16", back: "#8E44AD" };
let s = [];
const add = (x) => s.push(x);
const text = (x, y, t, o = {}) => add(`<text x="${x}" y="${y}" font-family="Arial" font-size="${o.size || 12}" fill="${o.fill || "#222"}" font-weight="${o.bold ? "bold" : "normal"}" text-anchor="${o.anchor || "middle"}">${t}</text>`);
const pad = (c, r, color = "#555", sq = false) => add(sq
  ? `<rect x="${X(c) - 6}" y="${Y(r) - 6}" width="12" height="12" fill="${color}"/>`
  : `<circle cx="${X(c)}" cy="${Y(r)}" r="6" fill="${color}"/>`);
const res = (c1, r1, c2, r2, label, color = C.part) => {
  add(`<line x1="${X(c1)}" y1="${Y(r1)}" x2="${X(c2)}" y2="${Y(r2)}" stroke="${color}" stroke-width="3"/>`);
  const mx = (X(c1) + X(c2)) / 2, my = (Y(r1) + Y(r2)) / 2, vert = c1 === c2;
  add(`<rect x="${mx - (vert ? 8 : 22)}" y="${my - (vert ? 22 : 8)}" width="${vert ? 16 : 44}" height="${vert ? 44 : 16}" rx="4" fill="#F5DEB3" stroke="${color}" stroke-width="2"/>`);
  pad(c1, r1, color); pad(c2, r2, color);
  text(mx + (vert ? 26 : 0), my + (vert ? 4 : -14), label, { bold: true, size: 13, anchor: vert ? "start" : "middle" });
};
const circ = (cx, cy, rad, label, color = C.part, fill = "none") =>
  { add(`<circle cx="${X(cx)}" cy="${Y(cy)}" r="${rad * P}" fill="${fill}" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 4"/>`); if (label) text(X(cx), Y(cy) + 5, label, { bold: true, size: 13 }); };
const header = (c, r0, n, labels, color, title, side = "right") => {
  add(`<rect x="${X(c) - 12}" y="${Y(r0) - 12}" width="24" height="${(n - 1) * P + 24}" rx="3" fill="#222" opacity="0.12" stroke="#222"/>`);
  for (let i = 0; i < n; i++) { pad(c, r0 + i, color, true); if (labels[i]) text(X(c) + (side === "right" ? 16 : -16), Y(r0 + i) + 4, labels[i], { size: 11, anchor: side === "right" ? "start" : "end" }); }
  text(X(c), Y(r0) - 18, title, { bold: true, size: 13 });
};

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
add(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);
add(`<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${C.keep}" stroke-width="3" opacity="0.45"/></pattern></defs>`);
// board
add(`<rect x="${X(-0.6)}" y="${Y(-0.6)}" width="${(COLS - 1 + 1.2) * P}" height="${(ROWS - 1 + 1.2) * P}" rx="10" fill="${C.board}" stroke="#7A9A80" stroke-width="3"/>`);
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) add(`<circle cx="${X(c)}" cy="${Y(r)}" r="3.2" fill="${C.hole}"/>`);
for (let c = 0; c < COLS; c += 5) text(X(c), Y(-0.6) - 8, c, { size: 11, fill: "#777" });
for (let r = 0; r < ROWS; r += 5) text(X(-0.6) - 14, Y(r) + 4, r, { size: 11, fill: "#777" });

// antenna keep-out (above and beside the devkit's antenna end)
add(`<rect x="${X(0.5)}" y="${Y(-2.2)}" width="${11 * P}" height="${2.6 * P}" fill="url(#hatch)" stroke="${C.keep}" stroke-width="2"/>`);
add(`<rect x="${X(11.6)}" y="${Y(-0.6)}" width="${4 * P}" height="${3 * P}" fill="url(#hatch)" stroke="${C.keep}" stroke-width="2" stroke-dasharray="5 4"/>`);
text(X(6), Y(-1.4), "ANTENNA — overhangs the top edge; nothing on either side", { bold: true, size: 12, fill: C.keep });
text(X(13.6), Y(1.1), "keep", { size: 11, fill: C.keep }); text(X(13.6), Y(1.6), "clear", { size: 11, fill: C.keep });

// devkit outline + headers
add(`<rect x="${X(0.51)}" y="${Y(-0.71)}" width="${10.98 * P}" height="${21.42 * P}" rx="6" fill="${C.dev}" opacity="0.10" stroke="${C.dev}" stroke-width="2.5"/>`);
add(`<rect x="${X(4.6)}" y="${Y(20.2)}" width="${2.8 * P}" height="${1.2 * P}" fill="#999" stroke="#555"/>`);
text(X(6), Y(21.9) + 16, "USB — overhangs the bottom edge (cable access)", { bold: true, size: 12, fill: "#555" });
text(X(6), Y(15) - 6, "ESP32 DevKitC (U1)", { bold: true, size: 15, fill: C.dev });
text(X(6), Y(15) + 12, "soldered directly — used pins + 4 corners", { size: 12, fill: C.dev });
const L = { 1: ["3V3", C.pwr], 5: ["IO34", C.sig], 9: ["IO25", C.sig], 11: ["IO27", C.sig], 14: ["GND", C.gnd], 19: ["5V", C.pwr] };
const R = { 20: ["GND", C.gnd], 22: ["IO22 SDA", C.i2c], 25: ["IO21 SCL", C.i2c], 26: ["GND", C.gnd], 34: ["IO2", C.sig] };
for (let p = 1; p <= 19; p++) { const k = L[p]; pad(1, p, k ? k[1] : "#8A94A6", true); if (k) text(X(1) - 14, Y(p) + 4, k[0], { size: 11, bold: true, anchor: "end", fill: k[1] }); }
for (let p = 20; p <= 38; p++) { const r = p - 19, k = R[p]; pad(11, r, k ? k[1] : "#8A94A6", true); if (k) text(X(11) - 14, Y(r) + 4, k[0], { size: 11, bold: true, anchor: "end", fill: k[1] }); }
text(X(1) + 14, Y(1) + 4, "pin 1", { size: 10, anchor: "start", fill: "#555" });
[[1,1],[1,19],[11,1],[11,19],[1,5],[1,9],[1,11],[1,14],[11,3],[11,6],[11,7],[11,15]].forEach(([c,r]) => add(`<circle cx="${X(c)}" cy="${Y(r)}" r="11" fill="none" stroke="#F39C12" stroke-width="3"/>`));

// under the devkit (low parts, fitted before the devkit goes in)
res(13, 7, 16, 7, "R3 100k");
res(13, 8, 16, 8, "");
text(X(16) + 12, Y(8) + 4, "R4 100k", { bold: true, size: 13, anchor: "start" });
res(13, 9, 15, 9, "");
text(X(15) + 12, Y(9) + 4, "C4 100n", { bold: true, size: 13, anchor: "start" });

// right-hand area
add(`<rect x="${X(19.6)}" y="${Y(0.55)}" width="${2.8 * P}" height="${0.9 * P}" rx="4" fill="#DDD" stroke="#555" stroke-width="2"/>`);
pad(20, 1, C.sig); pad(21, 1, C.pwr); pad(22, 1, "#555");
text(X(21), Y(0.1) - 6, "SW1 slide (power)", { bold: true, size: 13 });
text(X(20), Y(1.9) + 6, "A", { size: 11 }); text(X(21), Y(1.9) + 6, "B", { size: 11 }); text(X(22), Y(1.9) + 6, "C", { size: 11 });
header(26, 3, 4, ["3V3", "GND", "SCL", "SDA"], C.i2c, "U2 lead");
res(14, 4, 17, 4, "R5 4.7k*"); res(14, 5, 17, 5, "R6 4.7k*");
circ(20, 9, 2.75, "", C.part);
pad(18, 9, C.gnd); pad(22, 9, C.pwr); text(X(20), Y(9) - 4, "BZ1", { bold: true, size: 14 }); text(X(20), Y(9) + 14, "piezo", { size: 11 });
text(X(18), Y(9) + 22, "−", { bold: true, size: 14 }); text(X(22), Y(9) + 22, "+", { bold: true, size: 14 });
add(`<path d="M ${X(13.6)} ${Y(11) + 8} A ${1.4 * P} ${1.1 * P} 0 0 1 ${X(16.4)} ${Y(11) + 8} Z" fill="#D5D8DC" stroke="#333" stroke-width="2"/>`);
pad(14, 11, C.gnd); pad(15, 11, C.sig); pad(16, 11, C.part);
text(X(15), Y(11) - 26, "Q1 2N2222", { bold: true, size: 13 });
text(X(14), Y(11) + 24, "E", { size: 11 }); text(X(15), Y(11) + 24, "B", { size: 11 }); text(X(16), Y(11) + 24, "C", { size: 11 });
res(13, 13, 16, 13, "R1 1k");
res(18, 13, 21, 13, "D1 1N4148");
add(`<rect x="${X(21) - 26}" y="${Y(13) - 8}" width="6" height="16" fill="#111"/>`);
text(X(21) + 14, Y(13) + 4, "band → +5V", { size: 10, anchor: "start" });
header(24, 9, 6, ["3V3", "GND", "SDA", "SCL", "—", "—"], C.i2c, "U3 gauge (opt.)");
[["M1 OUT+", C.pwr], ["M1 OUT−", C.gnd], ["M2 IN+", C.sig], ["M2 IN−", C.gnd], ["M2 OUT+", C.pwr], ["M2 OUT−", C.gnd]].forEach(([l, col], i) => { pad(27, 10 + i, col); text(X(27) + 14, Y(10 + i) + 4, l, { size: 11, anchor: "start", bold: true, fill: col }); });
text(X(27) + 14, Y(9) - 4, "wire pads", { size: 12, anchor: "start", bold: true });
res(14, 15, 17, 15, "R2 330");
circ(19.5, 15, 0.85, "", C.part); pad(19, 15, C.part); pad(20, 15, C.gnd);
text(X(19.5), Y(15) - 30, "D2 LED", { bold: true, size: 13 }); text(X(20) + 12, Y(15) + 26, "K", { size: 11 });
circ(13.5, 20, 1.25, "", C.pwr); pad(13, 20, C.pwr); pad(14, 20, C.gnd); text(X(13.5), Y(20) - 44, "C1 100µF", { bold: true, size: 13 });
text(X(13), Y(20) + 24, "+", { bold: true, size: 13 });
res(16, 20, 18, 20, "C2 100n");
circ(21, 19, 2, "", C.pwr); pad(20, 19, C.pwr); pad(22, 19, C.gnd); text(X(21), Y(19) - 2, "C3", { bold: true, size: 14 }); text(X(21), Y(19) + 14, "470µF", { size: 11 });
text(X(20), Y(19) + 26, "+", { bold: true, size: 13 });
add(`<rect x="${X(24) - 6}" y="${Y(18) - 6}" width="${3 * P + 12}" height="${2 * P + 12}" rx="6" fill="#E5E7E9" stroke="#333" stroke-width="2"/>`);
add(`<circle cx="${(X(24) + X(27)) / 2}" cy="${(Y(18) + Y(20)) / 2}" r="16" fill="#AAB7B8" stroke="#333"/>`);
[[24, 18], [27, 18], [24, 20], [27, 20]].forEach(([c, r]) => pad(c, r, "#333"));
text((X(24) + X(27)) / 2, Y(17.4) - 4, "SW2 SOS", { bold: true, size: 13 });

// back side note
add(`<rect x="${X(13.2)}" y="${Y(16.3)}" width="${14.4 * P}" height="${5.3 * P}" fill="none" stroke="${C.back}" stroke-width="2.5" stroke-dasharray="10 6"/>`);
text(X(20.4), Y(21.5) + 22, "BACK side, this area: Li-Po cell + TP4056 (M1) + MT3608 (M2) on an insulating sheet", { bold: true, size: 12, fill: C.back });

// legend / wiring (right column)
const lx = X(COLS - 1) + 110; let ly = M;
const line = (t, o = {}) => { text(lx, ly, t, { anchor: "start", size: o.size || 13, bold: o.bold, fill: o.fill }); ly += o.gap || 20; };
line("Wiring (underside, insulated wire)", { bold: true, size: 15, gap: 26 });
[["+3V3", "U1 3V3 → C3+, R5, R6, U2 3V3, U3 3V3", C.pwr], ["+5V", "U1 5V → C1+, C2, D1 band, BZ1+, M2 OUT+", C.pwr],
 ["VBAT", "M1 OUT+ → SW1 B, R3 (+ U3 CELL if fitted)", C.pwr], ["VSW", "SW1 A → M2 IN+", C.sig],
 ["GND", "U1 GND ×3 → C1−, C2, C3−, R4, C4, Q1 E, D2 K, SW2, U2, U3, M1 OUT−, M2 IN−, M2 OUT−", C.gnd],
 ["SDA", "U1 IO22 → R5, U2 SDA, U3 SDA", C.i2c], ["SCL", "U1 IO21 → R6, U2 SCL, U3 SCL", C.i2c],
 ["SENSE", "U1 IO34 → R3/R4 junction, C4", C.sig], ["SOS", "U1 IO27 → SW2 (other leg → GND)", C.sig],
 ["BUZZ", "U1 IO25 → R1 → Q1 B;  Q1 C → BZ1−, D1 anode", C.sig], ["LED", "U1 IO2 → R2 → D2 anode", C.sig]]
 .forEach(([n, d, col]) => { text(lx, ly, n, { anchor: "start", bold: true, fill: col }); const words = d.split(" "); let ln = "", yy = ly; words.forEach((w) => { if ((ln + w).length > 42) { text(lx + 62, yy, ln, { anchor: "start", size: 12 }); ln = ""; yy += 16; } ln += w + " "; }); text(lx + 62, yy, ln, { anchor: "start", size: 12 }); ly = yy + 22; });
ly += 6;
line("* R5/R6 only if the sensor breakout", { size: 12 }); line("  has no pull-ups of its own.", { size: 12, gap: 26 });
line("Orange rings: devkit pins to solder", { bold: true }); line("(used pins + 4 corners; rest may stay unsoldered)", { size: 12, gap: 26 });
line("Before wiring M2 OUT+ to the board:", { bold: true }); line("MT3608 alone on the cell = 5.0 V (meter)", { size: 12, fill: C.pwr }); line("Lay C1 and C3 on their sides to stay thin.", { size: 12, gap: 26 });
line("Proposed placement — dry-fit every part", { size: 12, bold: true }); line("before soldering. Board assumed 28 × 22", { size: 12 }); line("holes; adjust if yours differs.", { size: 12 });
add(`</svg>`);

fs.writeFileSync(OUT_SVG, s.join("\n"));
console.log("wrote", OUT_SVG);
if (OUT_PNG) require("sharp")(Buffer.from(s.join("\n"))).png().toFile(OUT_PNG).then(() => console.log("wrote", OUT_PNG));
