// Beacon node perfboard layout (5 x 7 cm board, portrait, 18 x 24 holes) — component side and solder side.
// Usage: node perfboard_beacon.js <component.svg> <solder.svg> [component.png] [solder.png]
// ESP32 DevKitC soldered directly to the perfboard (no female headers): pin 1 (3V3) at column 1, row 4; pins 20-38 in column 11.
// Optional outside status LED: IO2 (pin 34) -> R1 330R -> D1 anode, D1 cathode -> GND (pin 26).
const fs = require("fs");
const [, , OUT_C, OUT_S, PNG_C, PNG_S] = process.argv;

const COLS = 18, ROWS = 24, P = 30, M = 70, TOP = 4;
const W = M * 2 + (COLS - 1) * P + 430, H = M * 2 + (ROWS - 1) * P + 70;
const C = { board: "#EAF4EC", solder: "#F4ECD8", hole: "#B7C4BA", dev: "#1F3864", pwr: "#C0392B", gnd: "#333333",
            sig: "#0E5E6F", keep: "#E4572E", part: "#6B4E16", hdr: "#2C3E50", pad: "#B8860B" };
const IO2 = TOP + 14, GND26 = TOP + 6;            // header rows of pin 34 and pin 26 (column 11)
const R1 = [[12, IO2], [15, IO2]];                // R1 330R, 7.62 mm lead spacing
const D1A = [15, IO2 + 1], D1K = [15, IO2 + 2];   // LED: anode (long leg) under R1, cathode below
const GLINK = [[15, IO2 + 2], [16, IO2 + 2], [16, GND26], [11, GND26]];

function draw(mirror) {
  const mc = (c) => (mirror ? COLS - 1 - c : c);
  const X = (c) => M + mc(c) * P, Y = (r) => M + r * P;
  const s = []; const add = (x) => s.push(x);
  const text = (x, y, t, o = {}) => add(`<text x="${x}" y="${y}" font-family="Arial" font-size="${o.size || 12}" fill="${o.fill || "#222"}" font-weight="${o.bold ? "bold" : "normal"}" text-anchor="${o.anchor || "middle"}">${t}</text>`);
  const link = (pts, col, w = 6) => add(`<polyline points="${pts.map(([c, r]) => X(c) + "," + Y(r)).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>`);
  const dot = (c, r, col, rad = 6) => add(`<circle cx="${X(c)}" cy="${Y(r)}" r="${rad}" fill="${col}"/>`);
  const ring = (c, r) => add(`<circle cx="${X(c)}" cy="${Y(r)}" r="12" fill="none" stroke="#F39C12" stroke-width="3"/>`);

  add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  add(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);
  add(`<rect x="${M - 0.6 * P}" y="${Y(-0.6)}" width="${(COLS - 1 + 1.2) * P}" height="${(ROWS - 1 + 1.2) * P}" rx="10" fill="${mirror ? C.solder : C.board}" stroke="#7A9A80" stroke-width="3"/>`);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) add(`<circle cx="${X(c)}" cy="${Y(r)}" r="3.2" fill="${C.hole}"/>`);
  for (let c = 0; c < COLS; c += 5) text(X(c), Y(-0.6) - 8, c, { size: 11, fill: "#777" });
  for (let r = 0; r < ROWS; r += 5) text(M - 0.6 * P - 14, Y(r) + 4, r, { size: 11, fill: "#777" });
  text(W / 2 - 200, 30, mirror ? "SOLDER SIDE — board flipped over sideways (left and right swap)" : "COMPONENT SIDE — parts go on this side",
       { size: 16, bold: true, fill: mirror ? C.keep : C.dev });

  // ESP32 pin rows: columns 1 and 11, rows 4..22 (the devkit's own pins, soldered directly)
  for (const col of [1, 11]) {
    const x0 = Math.min(X(col), X(col)) - 12;
    add(`<rect x="${x0}" y="${Y(TOP) - 14}" width="24" height="${18 * P + 28}" rx="3" fill="${C.hdr}" opacity="${mirror ? 0.08 : 0.35}" stroke="${C.hdr}" stroke-width="2"/>`);
  }
  if (!mirror) {
    // devkit outline (plugged in on top of the headers)
    const xa = Math.min(X(0.51), X(11.49));
    add(`<rect x="${xa}" y="${Y(TOP - 2.76)}" width="${10.98 * P}" height="${21.65 * P}" rx="6" fill="${C.dev}" opacity="0.08" stroke="${C.dev}" stroke-width="2.5" stroke-dasharray="8 5"/>`);
    add(`<rect x="${X(4.6)}" y="${Y(TOP + 18.4)}" width="${2.8 * P}" height="${1.4 * P}" fill="#999" stroke="#555"/>`);
    text(X(6), Y(TOP + 7), "ESP32 DevKitC", { bold: true, size: 15, fill: C.dev });
    text(X(6), Y(TOP + 7) + 18, "soldered DIRECTLY to the board", { size: 12, fill: C.dev });
    text(X(6), Y(TOP + 7) + 34, "(no female headers)", { size: 12, fill: C.dev });
    text(X(6), Y(TOP + 7) + 50, "antenna UP, USB DOWN", { size: 12, bold: true, fill: C.dev });
    text(X(6), Y(ROWS - 0.2) + 28, "USB end — plug the 5 V phone charger in here", { bold: true, size: 12, fill: C.pwr });
    text(X(6), Y(0.6), "ANTENNA end — keep clear", { bold: true, size: 12, fill: C.keep });
  } else {
    text((X(1) + X(11)) / 2, Y(0.6), "antenna end (top)", { size: 12, bold: true, fill: C.keep });
    text((X(1) + X(11)) / 2, Y(ROWS - 0.2) + 28, "USB end (bottom)", { size: 12, bold: true, fill: "#555" });
  }
  // header pins with labels
  const L = { 1: ["3V3", C.pwr], 14: ["GND", C.gnd], 19: ["5V", C.pwr] };
  const R = { 20: ["GND", C.gnd], 26: ["GND", C.gnd], 34: ["IO2", C.sig] };
  for (let p = 1; p <= 38; p++) {
    const left = p <= 19, col = left ? 1 : 11, r = left ? TOP + p - 1 : TOP + p - 20, k = (left ? L : R)[p];
    dot(col, r, mirror ? C.pad : (k ? k[1] : "#8A94A6"), mirror ? 7 : 6);
    if (k) {
      const outward = (left !== mirror) ? -1 : 1;           // label on the outer side of each column
      text(X(col) + outward * 14, Y(r) + 4, k[0], { size: 11, bold: true, anchor: outward < 0 ? "end" : "start", fill: k[1] });
    }
  }
  // R1 and D1 (optional)
  if (!mirror) {
    add(`<line x1="${X(R1[0][0])}" y1="${Y(IO2)}" x2="${X(R1[1][0])}" y2="${Y(IO2)}" stroke="${C.part}" stroke-width="3"/>`);
    const mx = (X(R1[0][0]) + X(R1[1][0])) / 2;
    add(`<rect x="${mx - 26}" y="${Y(IO2) - 8}" width="52" height="16" rx="4" fill="#F5DEB3" stroke="${C.part}" stroke-width="2"/>`);
    text(mx, Y(IO2) - 14, "R1 330 Ω", { bold: true, size: 12 });
    add(`<circle cx="${X(15)}" cy="${(Y(D1A[1]) + Y(D1K[1])) / 2}" r="${P * 0.95}" fill="#FDEBD0" stroke="#D35400" stroke-width="2.5" opacity="0.9"/>`);
    text(X(15) + 34, Y(D1A[1]) + 4, "A (long leg)", { size: 11, anchor: "start", bold: true, fill: "#D35400" });
    text(X(15) + 34, Y(D1K[1]) + 4, "K (flat side)", { size: 11, anchor: "start", bold: true, fill: "#333" });
    text(X(15) + 34, Y(D1K[1]) + 22, "D1 LED", { size: 12, anchor: "start", bold: true, fill: "#D35400" });
    [R1[0], R1[1], D1A, D1K].forEach(([c, r]) => dot(c, r, C.part));
  } else {
    [R1[0], R1[1], D1A, D1K].forEach(([c, r]) => dot(c, r, C.pad, 7));
  }
  // solder-side links (drawn on both views; dashed on the component side because they are underneath)
  const underside = (pts, col) => mirror ? link(pts, col, 7) :
    add(`<polyline points="${pts.map(([c, r]) => X(c) + "," + Y(r)).join(" ")}" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="6 5"/>`);
  underside([[11, IO2], [12, IO2]], C.sig);          // link A: IO2 -> R1 lead
  underside([[15, IO2], [15, IO2 + 1]], C.part);     // link B: R1 lead -> LED anode
  underside(GLINK, C.gnd);                           // link C: LED cathode -> GND (pin 26)
  ring(11, IO2); ring(12, IO2); ring(15, IO2); ring(15, IO2 + 1); ring(15, IO2 + 2); ring(11, GND26);
  text(X(13.5), Y(GND26) - 12, "link C", { size: 11, bold: true, fill: C.gnd });
  text(X(11.5), Y(IO2) + 24, "link A", { size: 11, bold: true, fill: C.sig });
  text(X(15), Y(IO2) - 30 + (mirror ? 0 : -6), "", {});

  // legend
  const lx = M + (COLS - 1) * P + 110; let ly = M;
  const line = (t, o = {}) => { text(lx, ly, t, { anchor: "start", size: o.size || 13, bold: o.bold, fill: o.fill }); ly += o.gap || 20; };
  line(mirror ? "Beacon node — solder side" : "Beacon node — component side", { bold: true, size: 15, gap: 28 });
  line("ESP32 pins: columns 1 and 11, rows 4–22", { size: 12 });
  line("(soldered directly, no headers; solder ALL 38 pins)", { size: 12, gap: 24 });
  line("Optional status LED (visible outside the box):", { bold: true, size: 12 });
  line("R1 330 Ω: row 18, columns 12 → 15", { size: 12 });
  line("D1 LED: column 15, anode row 19, cathode row 20", { size: 12, gap: 24 });
  line("Link A  IO2 (11,18) → R1 (12,18)", { fill: C.sig, bold: true });
  line("        solder bridge between the two pads", { size: 12, gap: 20 });
  line("Link B  R1 (15,18) → LED anode (15,19)", { fill: C.part, bold: true });
  line("        solder bridge", { size: 12, gap: 20 });
  line("Link C  LED cathode (15,20) → GND pin 26 (11,10)", { fill: C.gnd, bold: true });
  line("        bare wire: right to col 16, up to row 10,", { size: 12 });
  line("        left along row 10 to column 11", { size: 12, gap: 24 });
  line("Orange rings: the joints for the LED circuit.", { size: 12, gap: 24 });
  if (mirror) { line("This view is the board turned over:", { bold: true, size: 12, fill: C.keep }); line("column 1 is now on the RIGHT.", { size: 12, fill: C.keep, gap: 24 }); }
  line("Power: USB 5 V charger into the devkit.", { size: 12, bold: true });
  line("Board assumed 18 × 24 holes — dry-fit first.", { size: 12, bold: true });
  add(`</svg>`);
  return s.join("\n");
}
const comp = draw(false), sold = draw(true);
fs.writeFileSync(OUT_C, comp); fs.writeFileSync(OUT_S, sold); console.log("wrote", OUT_C, OUT_S);
if (PNG_C) {
  const sharp = require("sharp");
  sharp(Buffer.from(comp)).png().toFile(PNG_C).then(() => console.log("wrote", PNG_C));
  if (PNG_S) sharp(Buffer.from(sold)).png().toFile(PNG_S).then(() => console.log("wrote", PNG_S));
}
