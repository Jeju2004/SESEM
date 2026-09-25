// Door sensor node perfboard placement map (5 x 7 cm board, portrait, 18 x 24 holes).
// Usage: node perfboard_door_map.js <out.svg> [out.png]
// Component side up. Devkit pin 1 (3V3) at (1,4), soldered directly; USB end overhangs the bottom edge
// (power input). Reed switch on a 2-pin screw terminal wired to IO18 and GND with two short links.
const fs = require("fs");
const [, , OUT_SVG, OUT_PNG] = process.argv;

const COLS = 18, ROWS = 24, P = 30, M = 70, TOP = 4;     // TOP = row of devkit pin 1
const W = M * 2 + (COLS - 1) * P + 400, H = M * 2 + (ROWS - 1) * P + 50;
const X = (c) => M + c * P, Y = (r) => M + r * P;
const C = { board: "#EAF4EC", hole: "#B7C4BA", dev: "#1F3864", pwr: "#C0392B", gnd: "#333333", sig: "#0E5E6F", keep: "#E4572E", part: "#6B4E16" };
const s = []; const add = (x) => s.push(x);
const text = (x, y, t, o = {}) => add(`<text x="${x}" y="${y}" font-family="Arial" font-size="${o.size || 12}" fill="${o.fill || "#222"}" font-weight="${o.bold ? "bold" : "normal"}" text-anchor="${o.anchor || "middle"}">${t}</text>`);
const pad = (c, r, color = "#555", sq = false) => add(sq ? `<rect x="${X(c) - 6}" y="${Y(r) - 6}" width="12" height="12" fill="${color}"/>` : `<circle cx="${X(c)}" cy="${Y(r)}" r="6" fill="${color}"/>`);
const res = (c1, r1, c2, r2, label) => {
  add(`<line x1="${X(c1)}" y1="${Y(r1)}" x2="${X(c2)}" y2="${Y(r2)}" stroke="${C.part}" stroke-width="3"/>`);
  const mx = (X(c1) + X(c2)) / 2, my = (Y(r1) + Y(r2)) / 2;
  add(`<rect x="${mx - 22}" y="${my - 8}" width="44" height="16" rx="4" fill="#F5DEB3" stroke="${C.part}" stroke-width="2"/>`);
  pad(c1, r1, C.part); pad(c2, r2, C.part); text(mx, my - 14, label, { bold: true, size: 13 });
};

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
add(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);
add(`<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${C.keep}" stroke-width="3" opacity="0.45"/></pattern></defs>`);
add(`<rect x="${X(-0.6)}" y="${Y(-0.6)}" width="${(COLS - 1 + 1.2) * P}" height="${(ROWS - 1 + 1.2) * P}" rx="10" fill="${C.board}" stroke="#7A9A80" stroke-width="3"/>`);
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) add(`<circle cx="${X(c)}" cy="${Y(r)}" r="3.2" fill="${C.hole}"/>`);
for (let c = 0; c < COLS; c += 5) text(X(c), Y(-0.6) - 8, c, { size: 11, fill: "#777" });
for (let r = 0; r < ROWS; r += 5) text(X(-0.6) - 14, Y(r) + 4, r, { size: 11, fill: "#777" });

// antenna keep-out: rows above the devkit's antenna end
add(`<rect x="${X(0.5)}" y="${Y(-0.5)}" width="${11 * P}" height="${(TOP - 1.2) * P}" fill="url(#hatch)" stroke="${C.keep}" stroke-width="2"/>`);
text(X(6), Y(0.8), "ANTENNA end — keep this area empty", { bold: true, size: 12, fill: C.keep });

// devkit
add(`<rect x="${X(0.51)}" y="${Y(TOP - 1.71)}" width="${10.98 * P}" height="${21.42 * P}" rx="6" fill="${C.dev}" opacity="0.10" stroke="${C.dev}" stroke-width="2.5"/>`);
add(`<rect x="${X(4.6)}" y="${Y(TOP + 18.9)}" width="${2.8 * P}" height="${1.2 * P}" fill="#999" stroke="#555"/>`);
text(X(6), Y(ROWS - 0.2) + 26, "USB — overhangs the bottom edge: POWER IN (5 V adapter)", { bold: true, size: 12, fill: C.pwr });
text(X(6), Y(TOP + 8), "ESP32 DevKitC", { bold: true, size: 15, fill: C.dev });
text(X(6), Y(TOP + 8) + 18, "soldered directly", { size: 12, fill: C.dev });
const L = { 1: ["3V3", C.pwr], 14: ["GND", C.gnd], 19: ["5V", C.pwr] };
const R = { 20: ["GND", C.gnd], 26: ["GND", C.gnd], 28: ["IO18 REED", C.sig], 34: ["IO2", C.sig] };
for (let p = 1; p <= 19; p++) { const k = L[p], r = TOP + p - 1; pad(1, r, k ? k[1] : "#8A94A6", true); if (k) text(X(1) + 14, Y(r) + 4, k[0], { size: 11, bold: true, anchor: "start", fill: k[1] }); }
for (let p = 20; p <= 38; p++) { const r = TOP + p - 20, k = R[p]; pad(11, r, k ? k[1] : "#8A94A6", true); if (k) text(X(11) - 14, Y(r) + 4, k[0], { size: 11, bold: true, anchor: "end", fill: k[1] }); }
// pins to solder: IO18, GND (pin 26) and the four corners
[[11, TOP + 8], [11, TOP + 6], [1, TOP], [1, TOP + 18], [11, TOP], [11, TOP + 18]].forEach(([c, r]) =>
  add(`<circle cx="${X(c)}" cy="${Y(r)}" r="11" fill="none" stroke="#F39C12" stroke-width="3"/>`));

// J1 screw terminal (5.08 mm pitch = 2 holes): upper = reed/IO18, lower = reed/GND
const ju = TOP + 8, jl = TOP + 10;
add(`<rect x="${X(13.4)}" y="${Y(ju) - 16}" width="${1.2 * P}" height="${2 * P + 32}" rx="4" fill="#5DADE2" opacity="0.35" stroke="#1B4F72" stroke-width="2"/>`);
// underside links (drawn as seen from the component side)
const link = (pts, col) => add(`<polyline points="${pts.map(([c, r]) => X(c) + "," + Y(r)).join(" ")}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round" opacity="0.8"/>`);
link([[11, ju], [14, ju]], C.sig);
link([[11, TOP + 6], [15, TOP + 6], [15, jl], [14, jl]], C.gnd);
pad(14, ju, C.sig); pad(14, jl, C.gnd);
text(X(14), Y(ju) - 24, "J1 terminal", { bold: true, size: 13 });
text(X(14) + 16, Y(ju) + 4, "", {});
text(X(12.5), Y(ju) + 22, "link A", { size: 11, fill: C.sig, bold: true });
text(X(15) + 10, Y(TOP + 8) + 4, "link B", { size: 11, fill: C.gnd, bold: true, anchor: "start" });
text(X(14), Y(jl) + 32, "→ reed switch wires", { size: 11 });

// legend
const lx = X(COLS - 1) + 120; let ly = M;
const line = (t, o = {}) => { text(lx, ly, t, { anchor: "start", size: o.size || 13, bold: o.bold, fill: o.fill }); ly += o.gap || 20; };
line("Door sensor node — layout", { bold: true, size: 15, gap: 28 });
line("ESP32 pins in columns 1 and 11, rows 4–22", { size: 12 });
line("(USB at the bottom edge = power in)", { size: 12, gap: 24 });
line("J1 screw terminal: column 14, rows 12 and 14", { size: 12, gap: 24 });
line("Link A  IO18 (col 11, row 12) → J1 upper", { fill: C.sig, bold: true }); line("        along row 12, columns 11 → 14", { size: 12, gap: 22 });
line("Link B  GND (col 11, row 10) → J1 lower", { fill: C.gnd, bold: true }); line("        row 10 to column 15, down to row 14,", { size: 12 }); line("        then left to J1 (column 14)", { size: 12, gap: 24 });
line("Links: bare leg offcuts or a stripped jumper;", { size: 12 }); line("keep link A and link B from touching.", { size: 12, gap: 24 });
line("Orange rings: the only ESP32 pins to solder", { bold: true, size: 12 }); line("(IO18, GND, and the 4 corners).", { size: 12, gap: 24 });
line("Drawn from the COMPONENT side. On the", { bold: true, size: 12, fill: C.keep }); line("underside, left and right are swapped.", { size: 12, fill: C.keep, gap: 24 });
line("No resistor: the firmware turns on the", { size: 12 }); line("ESP32's internal pull-up on IO18.", { size: 12, gap: 24 });
line("Board assumed 18 × 24 holes — dry-fit first.", { size: 12, bold: true });
add(`</svg>`);
fs.writeFileSync(OUT_SVG, s.join("\n")); console.log("wrote", OUT_SVG);
if (OUT_PNG) require("sharp")(Buffer.from(s.join("\n"))).png().toFile(OUT_PNG).then(() => console.log("wrote", OUT_PNG));
