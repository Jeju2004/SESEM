// Door sensor node — SOLDER-SIDE view (board flipped over sideways: left and right swap, top stays top).
// Usage: node perfboard_door_underside.js <out.svg> [out.png]
// Same 5 x 7 cm board as perfboard_door_map.js (18 x 24 holes, devkit pin 1 at column 1, row 4 on the
// component side). Column numbers are kept as on the component side so the two views can be compared.
const fs = require("fs");
const [, , OUT_SVG, OUT_PNG] = process.argv;
const COLS = 18, ROWS = 24, P = 30, M = 70, TOP = 4;
const W = M * 2 + (COLS - 1) * P + 400, H = M * 2 + (ROWS - 1) * P + 50;
const mc = (c) => COLS - 1 - c;                                  // mirror a component-side column
const X = (c) => M + mc(c) * P, Y = (r) => M + r * P;
const C = { board: "#F4ECD8", hole: "#C9B98F", pad: "#B8860B", gnd: "#111111", sig: "#0E5E6F", keep: "#E4572E", note: "#5F6B73" };
const s = []; const add = (x) => s.push(x);
const text = (x, y, t, o = {}) => add(`<text x="${x}" y="${y}" font-family="Arial" font-size="${o.size || 12}" fill="${o.fill || "#222"}" font-weight="${o.bold ? "bold" : "normal"}" text-anchor="${o.anchor || "middle"}">${t}</text>`);
const joint = (c, r, col = C.pad) => add(`<circle cx="${X(c)}" cy="${Y(r)}" r="8" fill="${col}" stroke="#7D6608" stroke-width="1.5"/>`);
const ring = (c, r) => add(`<circle cx="${X(c)}" cy="${Y(r)}" r="13" fill="none" stroke="#F39C12" stroke-width="3"/>`);
const link = (pts, col) => add(`<polyline points="${pts.map(([c, r]) => X(c) + "," + Y(r)).join(" ")}" fill="none" stroke="${col}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>`);

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
add(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);
add(`<rect x="${M - 0.6 * P}" y="${Y(-0.6)}" width="${(COLS - 1 + 1.2) * P}" height="${(ROWS - 1 + 1.2) * P}" rx="10" fill="${C.board}" stroke="#A89060" stroke-width="3"/>`);
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) add(`<circle cx="${X(c)}" cy="${Y(r)}" r="5" fill="none" stroke="${C.hole}" stroke-width="2"/>`);
for (let c = 0; c < COLS; c += 5) text(X(c), Y(-0.6) - 8, c, { size: 11, fill: "#777" });
for (let r = 0; r < ROWS; r += 5) text(M - 0.6 * P - 14, Y(r) + 4, r, { size: 11, fill: "#777" });
text(W / 2 - 180, 28, "SOLDER SIDE — board flipped over sideways", { size: 16, bold: true, fill: C.keep });

// antenna end reminder (top) and USB end (bottom)
text((X(1) + X(11)) / 2, Y(1.2), "antenna end (top) — nothing here", { size: 12, bold: true, fill: C.keep });
text((X(1) + X(11)) / 2, Y(ROWS - 0.2) + 26, "USB end (bottom edge)", { size: 12, bold: true, fill: "#555" });

// devkit pin tips poking through: columns 1 and 11 (component-side numbering), rows 4..22
for (let r = TOP; r <= TOP + 18; r++) { add(`<rect x="${X(1) - 5}" y="${Y(r) - 5}" width="10" height="10" fill="#8A94A6"/>`); add(`<rect x="${X(11) - 5}" y="${Y(r) - 5}" width="10" height="10" fill="#8A94A6"/>`); }
text(X(1), Y(TOP) - 14, "left header", { size: 10, fill: C.note }); text(X(11), Y(TOP) - 14, "right header", { size: 10, fill: C.note });
text(X(1) + 18, Y(TOP + 18) + 4, "V5", { size: 11, bold: true, anchor: "start", fill: "#C0392B" });
text(X(1) + 18, Y(TOP) + 4, "3V3", { size: 11, bold: true, anchor: "start", fill: "#C0392B" });

// soldered pins
const solder = [[11, TOP + 8], [11, TOP + 6], [1, TOP], [1, TOP + 18], [11, TOP], [11, TOP + 18]];
solder.forEach(([c, r]) => { joint(c, r); ring(c, r); });
text(X(11) + 18, Y(TOP + 8) + 4, "G18", { size: 13, bold: true, fill: C.sig, anchor: "start" });
text(X(11) + 18, Y(TOP + 6) + 4, "GND", { size: 13, bold: true, fill: C.gnd, anchor: "start" });
text(X(11) + 18, Y(TOP) + 4, "GND (corner)", { size: 11, anchor: "start" });
text(X(11) + 18, Y(TOP + 18) + 4, "CLK (corner)", { size: 11, anchor: "start" });

// J1 pins
joint(14, TOP + 8, C.sig); joint(14, TOP + 10, C.gnd);
text(X(14), Y(TOP + 8) - 16, "J1", { size: 14, bold: true });
// links
link([[11, TOP + 8], [14, TOP + 8]], C.sig);
link([[11, TOP + 6], [15, TOP + 6], [15, TOP + 10], [14, TOP + 10]], C.gnd);
text((X(11) + X(14)) / 2, Y(TOP + 8) + 26, "link A", { size: 13, bold: true, fill: C.sig });
text(X(15) - 12, Y(TOP + 8) + 5, "link B", { size: 13, bold: true, fill: C.gnd, anchor: "end" });

// legend
const lx = M + (COLS - 1) * P + 120; let ly = M;
const line = (t, o = {}) => { text(lx, ly, t, { anchor: "start", size: o.size || 13, bold: o.bold, fill: o.fill }); ly += o.gap || 20; };
line("Door node — solder side", { bold: true, size: 15, gap: 28 });
line("Flip the board over sideways (left ↔ right).", { size: 12 }); line("Top stays top: antenna end up, USB end down.", { size: 12 });
line("Column numbers match the component-side map.", { size: 12, gap: 26 });
line("Orange rings = the only devkit pins to solder", { bold: true, size: 12 }); line("(G18, GND and the 4 corners).", { size: 12, gap: 26 });
line("Link A: G18 joint → J1 (same row), straight.", { size: 12, fill: C.sig, bold: true }); line("Link B: GND joint → outward 4 holes → down", { size: 12, fill: C.gnd, bold: true }); line("4 holes (row 10 → 14) → back 1 hole to J1.", { size: 12, fill: C.gnd, gap: 26 });
line("Bare leg offcuts are fine: lay each link along", { size: 12 }); line("the pads and solder it at every hole it crosses.", { size: 12 }); line("Keep link A and link B apart.", { size: 12, gap: 26 });
line("Check with a meter before powering:", { bold: true, size: 12 }); line("G18 ↔ J1 upper beeps · GND ↔ J1 lower beeps", { size: 12 }); line("J1 upper ↔ J1 lower silent · V5 ↔ GND silent", { size: 12 });
add(`</svg>`);
fs.writeFileSync(OUT_SVG, s.join("\n")); console.log("wrote", OUT_SVG);
if (OUT_PNG) require("sharp")(Buffer.from(s.join("\n"))).png().toFile(OUT_PNG).then(() => console.log("wrote", OUT_PNG));
