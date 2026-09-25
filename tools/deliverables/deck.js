// TroDes defense deck (10 min). Usage: node deck.js <out.pptx>
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const md = require("react-icons/md");

const OUT = process.argv[2];
const C = {
  ink: "0B2F3A", teal: "0E5E6F", safe: "2A9D8F", tint: "E8F3F4", alert: "E4572E",
  alertTint: "FCE9E4", text: "1F2933", muted: "5F6B73", white: "FFFFFF", line: "C9D6D9", amber: "E9A23B",
};
const HF = "Cambria", BF = "Calibri";

async function icon(Comp, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: 256 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = "TroDes — Electronics Design Defense";
  const W = 13.33;

  const I = {};
  const want = {
    person: md.MdElderly, watch: md.MdWatch, sos: md.MdSos, door: md.MdSensorDoor, pin: md.MdLocationOn,
    battery: md.MdBatteryChargingFull, heart: md.MdFavorite, web: md.MdDashboard, wifi: md.MdWifi,
    radio: md.MdBluetooth, bolt: md.MdBolt, check: md.MdCheckCircle, warn: md.MdWarning, science: md.MdScience,
    build: md.MdBuild, lightbulb: md.MdLightbulb, eye: md.MdVisibility, alarm: md.MdNotificationsActive,
  };
  for (const [k, comp] of Object.entries(want)) {
    I[k] = await icon(comp, C.white);
    I[k + "_t"] = await icon(comp, C.teal);
    I[k + "_a"] = await icon(comp, C.alert);
  }

  // --- helpers ---
  const title = (s, text, sub) => {
    s.addText(text, { x: 0.6, y: 0.4, w: W - 1.2, h: 0.8, fontFace: HF, fontSize: 34, bold: true, color: C.ink, margin: 0, isTextBox: true });
    if (sub) s.addText(sub, { x: 0.6, y: 1.15, w: W - 1.2, h: 0.45, fontFace: BF, fontSize: 16, color: C.muted, italic: true, margin: 0, isTextBox: true });
  };
  const circleIcon = (s, img, x, y, d, fill) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    const p = d * 0.22;
    s.addImage({ data: img, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  };
  const card = (s, x, y, w, h, fill = C.tint) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12 });
  const txt = (s, text, o) => s.addText(text, { fontFace: BF, fontSize: 15, color: C.text, valign: "top", isTextBox: true, ...o });
  const footer = (s, n) => s.addText(`TroDes  ·  ${n}`, { x: W - 2.6, y: 7.05, w: 2.0, h: 0.3, fontFace: BF, fontSize: 10, color: C.muted, align: "right", margin: 0, isTextBox: true });
  const pending = (s, text, x, y, w) => s.addText(text, { x, y, w, h: 0.4, fontFace: BF, fontSize: 12, bold: true, color: C.text, fill: { color: "FFF3B0" }, align: "center", valign: "middle", margin: 4, isTextBox: true });
  // Extents must be non-negative: an upward line is drawn downward and flipped.
  const arrow = (s, x, y, w, h, color = C.teal) =>
    s.addShape(pres.shapes.LINE, h < 0
      ? { x, y: y + h, w, h: -h, flipV: true, line: { color, width: 2.25, endArrowType: "triangle" } }
      : { x, y, w, h, line: { color, width: 2.25, endArrowType: "triangle" } });

  // 1. Title
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    circleIcon(s, I.pin_t, 0.8, 0.9, 1.0, C.white);
    s.addText("TroDes", { x: 0.8, y: 2.1, w: 11, h: 1.1, fontFace: HF, fontSize: 60, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("Smart Elderly Safety and Emergency Monitoring System with Geofencing", { x: 0.8, y: 3.2, w: 11.5, h: 0.6, fontFace: BF, fontSize: 24, color: "CFE8EA", margin: 0, isTextBox: true });
    s.addText("An Indoor BLE-Based Localization and Safety Monitoring System for a Home for the Aged", { x: 0.8, y: 3.8, w: 11.5, h: 0.5, fontFace: BF, fontSize: 18, italic: true, color: "9FC7CC", margin: 0, isTextBox: true });
    s.addText([
      { text: "Chester John B. Cirio  ·  Pathrish Anne R. Cruz", options: { bold: true, breakLine: true } },
      { text: "Adviser: Engr. Glenn V. Magwili", options: { breakLine: true } },
      { text: "Electronics Design · Section C1 · Mapúa University · 2 October 2026" },
    ], { x: 0.8, y: 5.3, w: 11.5, h: 1.3, fontFace: BF, fontSize: 16, color: C.white, margin: 0, paraSpaceAfter: 4, isTextBox: true });
    s.addNotes("~30 s. Introduce the team and the project in one sentence: an indoor system that tells caregivers where each resident is and raises alerts for restricted areas, SOS and low battery.");
  }

  // 2. Problem
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "The problem", "A home for the aged cannot watch every resident, every minute");
    const rows = [
      [I.eye_a, "Supervision gaps", "Caregivers are outnumbered by residents; continuous visual supervision is not practical, especially at night."],
      [I.door_a, "Restricted areas", "Residents — particularly those with cognitive decline — can wander into places such as the medicine room unnoticed."],
      [I.alarm_a, "Help that is not heard", "A resident who needs help may be unable to reach a caregiver or a call point."],
      [I.pin_a, "Wrong tools", "Most monitoring products are GPS-based for outdoor tracking and do not work reliably indoors."],
    ];
    rows.forEach(([img, h, b], i) => {
      const y = 1.9 + i * 1.22;
      circleIcon(s, img, 0.8, y, 0.85, C.alertTint);
      txt(s, h, { x: 1.95, y: y - 0.02, w: 10.4, h: 0.4, fontSize: 20, bold: true, color: C.ink, margin: 0 });
      txt(s, b, { x: 1.95, y: y + 0.38, w: 10.4, h: 0.6, fontSize: 15, color: C.muted, margin: 0 });
    });
    footer(s, 2);
    s.addNotes("~45 s. Frame the need without statistics we cannot cite. The key point: the facility needs to know WHERE residents are indoors and WHEN something is wrong. GPS does not work indoors, which is why the project pivoted from the original GPS/GSM design to BLE.");
  }

  // 3. Objectives
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Objectives", "Design and build an indoor localization and safety monitoring system for a care facility");
    const items = [
      [I.radio, "Zone detection", "Wearable identifies the resident's zone from fixed BLE beacons"],
      [I.door, "Restricted areas", "Alerts on entering a restricted zone or opening its door"],
      [I.sos, "SOS button", "Short press alerts; hold 3 s to cancel a false alarm"],
      [I.battery, "Power awareness", "Battery level reported, with low and critical alerts"],
      [I.heart, "Heart rate", "Displayed for information (not clinical)"],
      [I.web, "Caregiver dashboard", "Live web page on any browser or phone"],
    ];
    items.forEach(([img, h, b], i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.6 + col * 4.1, y = 1.95 + row * 2.45;
      card(s, x, y, 3.8, 2.15);
      circleIcon(s, img, x + 0.3, y + 0.3, 0.75, C.teal);
      txt(s, h, { x: x + 1.2, y: y + 0.38, w: 2.45, h: 0.6, fontSize: 18, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: x + 0.3, y: y + 1.2, w: 3.25, h: 0.85, fontSize: 14, color: C.text, margin: 0 });
    });
    footer(s, 3);
    s.addNotes("~45 s. These map one-to-one to the tests in Chapter 4. Mention the WiFi-down fallback as a design requirement too.");
  }

  // 4. Architecture
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "System architecture", "One beacon per zone · the wearable decides the zone · everything reports to the dashboard over WiFi");
    const box = (x, y, w, h, head, body, fill, headColor = C.white) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.1 });
      txt(s, [{ text: head, options: { bold: true, fontSize: 15, color: headColor, breakLine: !!body } }, ...(body ? [{ text: body, options: { fontSize: 12, color: headColor } }] : [])],
        { x: x + 0.1, y, w: w - 0.2, h, align: "center", valign: "middle", margin: 2 });
    };
    // beacons
    txt(s, "Zone beacons (BLE)", { x: 0.6, y: 1.85, w: 2.9, h: 0.35, fontSize: 13, bold: true, color: C.muted, margin: 0 });
    box(0.6, 2.25, 2.9, 0.75, "Bedroom Wing", "zone 1 · safe", C.safe);
    box(0.6, 3.15, 2.9, 0.75, "Dining Hall", "zone 2 · safe", C.safe);
    box(0.6, 4.05, 2.9, 0.75, "Medicine Room", "zone 11 · restricted", C.alert);
    // wearable
    box(4.4, 2.75, 2.9, 1.55, "Wearable", "ESP32 · SOS · buzzer · heart rate · battery", C.teal);
    arrow(s, 3.55, 3.5, 0.8, 0);
    txt(s, "iBeacon\nRSSI", { x: 3.5, y: 2.85, w: 0.95, h: 0.6, fontSize: 11, color: C.muted, align: "center", margin: 0 });
    // door node
    box(4.4, 5.25, 2.9, 1.1, "Door sensor node", "ESP32 · reed switch", C.alert);
    // wifi
    box(8.1, 3.9, 1.8, 1.0, "WiFi", "facility network", C.ink);
    arrow(s, 7.35, 3.5, 0.72, 0.6);
    arrow(s, 7.35, 5.8, 0.72, -0.85);
    // server + browser
    box(10.6, 2.75, 2.2, 1.35, "Dashboard server", "FastAPI · SQLite", C.teal);
    box(10.6, 4.75, 2.2, 1.35, "Caregiver", "browser or phone", C.ink);
    arrow(s, 9.95, 4.3, 0.6, -0.55);
    arrow(s, 11.7, 4.15, 0, 0.55);
    txt(s, "JSON over HTTP: status every 5 s, alerts immediately; events queued while WiFi is down", { x: 0.6, y: 6.6, w: 12.1, h: 0.35, fontSize: 12, italic: true, color: C.muted, margin: 0 });
    footer(s, 4);
    s.addNotes("~60 s. Walk left to right. Beacons only broadcast; the wearable listens, compares signal strengths and decides the zone itself, then posts status and alerts to the dashboard. The door node reports directly. If WiFi drops, the wearable queues events and chirps; they arrive in order when the link returns.");
  }

  // 5. Hardware
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Hardware", "Module-carrier design · hand-soldered perfboard (adviser-approved) · one MCU family");
    card(s, 0.6, 1.9, 6.4, 4.9);
    circleIcon(s, I.watch, 0.9, 2.15, 0.7, C.teal);
    txt(s, "Wearable", { x: 1.75, y: 2.2, w: 4.9, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "ESP32-WROOM-32 devkit on headers", options: { bullet: true, breakLine: true } },
      { text: "MAX30102 heart rate · SOS button (GPIO 27)", options: { bullet: true, breakLine: true } },
      { text: "Piezo buzzer via 2N2222 + 1N4148 flyback (GPIO 25)", options: { bullet: true, breakLine: true } },
      { text: "Battery sense: 100 k / 100 k divider on GPIO 34 (MAX17043 optional)", options: { bullet: true, breakLine: true } },
      { text: "I²C: SDA GPIO 22, SCL GPIO 21", options: { bullet: true } },
    ], { x: 0.9, y: 3.0, w: 5.9, h: 2.1, fontSize: 14, paraSpaceAfter: 6, margin: 0 });
    txt(s, "Power chain", { x: 0.9, y: 5.2, w: 5.9, h: 0.35, fontSize: 14, bold: true, color: C.teal, margin: 0 });
    const chain = ["Li-Po 3.7 V", "TP4056 + DW01", "MT3608 → 5.0 V", "ESP32 VIN → 3.3 V"];
    chain.forEach((c, i) => {
      const x = 0.9 + i * 1.5;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.6, w: 1.3, h: 0.8, fill: { color: C.white }, line: { color: C.teal, width: 1 }, rectRadius: 0.08 });
      txt(s, c, { x, y: 5.6, w: 1.3, h: 0.8, fontSize: 11, bold: true, color: C.ink, align: "center", valign: "middle", margin: 2 });
      if (i < chain.length - 1) arrow(s, x + 1.3, 6.0, 0.2, 0);
    });
    card(s, 7.3, 1.9, 5.4, 2.3);
    circleIcon(s, I.radio, 7.6, 2.15, 0.7, C.safe);
    txt(s, "Zone beacons ×3", { x: 8.45, y: 2.2, w: 4.0, h: 0.55, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, "Bare ESP32 devkits on 5 V USB power, iBeacon at +9 dBm, identical height and orientation. No custom board needed.", { x: 7.6, y: 2.95, w: 4.9, h: 1.1, fontSize: 14, margin: 0 });
    card(s, 7.3, 4.5, 5.4, 2.3, C.alertTint);
    circleIcon(s, I.door, 7.6, 4.75, 0.7, C.alert);
    txt(s, "Door sensor node", { x: 8.45, y: 4.8, w: 4.0, h: 0.55, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, "ESP32 + magnetic reed switch on GPIO 27 (internal pull-up), mains USB power, heartbeat every 30 s so a dead node shows OFFLINE.", { x: 7.6, y: 5.55, w: 4.9, h: 1.15, fontSize: 14, margin: 0 });
    footer(s, 5);
    s.addNotes("~60 s. Emphasise the module-carrier approach and that all three device types share the ESP32 and one toolchain. Power chain: the boost-to-5 V topology was chosen because no suitable low-dropout regulator could be sourced in time; the cost is runtime (see conclusions). Hold up the perfboard wearable here.");
  }

  // 6. Zone detection method
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "How the wearable decides the zone", "Compare beacons — never convert signal strength into distance");
    const steps = [
      ["1", "Listen", "Scan for the project's iBeacon UUID; ignore every other beacon"],
      ["2", "Smooth", "Exponential moving average of each beacon's RSSI (α = 0.35)"],
      ["3", "Threshold", "Ignore beacons below −88 dBm (too far to count)"],
      ["4", "Hysteresis", "A new zone must lead by 4 dB for 3 checks (~0.9 s)"],
      ["5", "Report", "Zone change → alert; restricted zone → buzzer + critical alert"],
    ];
    steps.forEach(([n, h, b], i) => {
      const x = 0.6 + i * 2.5;
      s.addShape(pres.shapes.OVAL, { x: x + 0.75, y: 1.95, w: 0.7, h: 0.7, fill: { color: i === 4 ? C.alert : C.teal }, line: { color: i === 4 ? C.alert : C.teal } });
      txt(s, n, { x: x + 0.75, y: 1.95, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
      if (i < steps.length - 1) arrow(s, x + 1.55, 2.3, 0.85, 0, C.line);
      txt(s, h, { x, y: 2.8, w: 2.2, h: 0.4, fontSize: 17, bold: true, color: C.ink, align: "center", margin: 0 });
      txt(s, b, { x, y: 3.25, w: 2.2, h: 1.2, fontSize: 13, color: C.muted, align: "center", margin: 0 });
    });
    card(s, 0.6, 4.85, 12.1, 1.9);
    circleIcon(s, I.lightbulb, 0.9, 5.15, 0.7, C.amber);
    txt(s, "Proximity mode — for zones that share one room", { x: 1.8, y: 5.1, w: 10.6, h: 0.45, fontSize: 18, bold: true, color: C.ink, margin: 0 });
    txt(s, "When zones share a room (as in this demonstration), a zone is entered only when its beacon is strong enough to mean \"within about 1 m\"; between beacons the wearable keeps its last zone instead of guessing. Added after Test 2 Run 1 — see the results.", { x: 1.8, y: 5.55, w: 10.6, h: 1.1, fontSize: 14, margin: 0 });
    footer(s, 6);
    s.addNotes("~60 s. The important design choice: classification compares beacons against each other and never relies on a distance estimate. Test 1 shows why that matters. Explain hysteresis as the anti-flicker mechanism.");
  }

  // 7. Design decisions
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Key design decisions", "Each chosen against its alternatives — supports SDG 3, Good Health and Well-Being");
    const rows = [
      ["Localization", "BLE beacons + ESP32 radio", "GPS (fails indoors), WiFi RSSI, RFID, UWB (cost)"],
      ["Caregiver interface", "Web dashboard (any browser/phone)", "Native mobile app — per-platform effort"],
      ["Wearable power", "Boost 5 V → devkit regulator", "Low-dropout LDO — none sourceable in time"],
      ["Door node MCU", "ESP32 (one family, working prototype)", "ESP8266 — cheaper, second toolchain"],
      ["Fabrication", "Perfboard, module carrier (approved 24 Sep)", "Hand-etched single-sided PCB (layout kept)"],
      ["Outdoor tracking, GSM", "Removed", "GPS + SIM800L — indoor failure, 2G sunset"],
    ];
    const hdr = ["Constraint", "Chosen", "Alternatives considered"].map((t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.teal } } }));
    const body = rows.map((r, i) => r.map((c, j) => ({ text: c, options: { bold: j === 0, color: C.text, fill: { color: i % 2 ? C.white : C.tint } } })));
    s.addTable([hdr, ...body], { x: 0.6, y: 1.85, w: 12.1, colW: [2.7, 4.5, 4.9], fontFace: BF, fontSize: 14, rowH: 0.62, border: { type: "solid", pt: 0.75, color: C.line }, valign: "middle", margin: 0.08 });
    footer(s, 7);
    s.addNotes("~45 s. The full weighted decision matrix is in Chapter 3 of the paper. Pick one row to explain in detail if time allows — localization technology is the strongest.");
  }

  // 8. Test 1
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Test 1 — Signal strength vs. distance", "Single beacon, +9 dBm, line of sight, ≥ 60 samples per mark (21 Sep 2026)");
    s.addChart(pres.charts.LINE, [
      { name: "Measured mean RSSI (dBm)", labels: ["1.0 m", "1.5 m", "2.0 m", "4.0 m", "6.0 m"], values: [-72.3, -71.1, -75.5, -70.4, -76.1] },
    ], {
      x: 0.6, y: 1.8, w: 6.9, h: 4.9, chartColors: [C.teal], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 9,
      showValue: true, dataLabelPosition: "t", dataLabelColor: C.ink, dataLabelFontSize: 12,
      valAxisMinVal: -80, valAxisMaxVal: -65, valAxisLabelColor: C.muted, catAxisLabelColor: C.muted,
      valGridLine: { color: "E5E7EB", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
      showTitle: true, title: "Mean RSSI at each distance (run A)", titleFontSize: 14, titleColor: C.ink,
    });
    txt(s, "Fitted path-loss exponent", { x: 7.9, y: 1.9, w: 4.8, h: 0.4, fontSize: 16, bold: true, color: C.muted, margin: 0 });
    txt(s, [{ text: "n = 0.28 / 0.55", options: { fontSize: 40, bold: true, color: C.alert, breakLine: true } }, { text: "free space = 2.0 (physical minimum)", options: { fontSize: 14, color: C.muted } }], { x: 7.9, y: 2.35, w: 4.8, h: 1.3, margin: 0 });
    txt(s, [
      { text: "The same ±3 dB pattern appeared with two different beacons → a property of the position, not the radio", options: { bullet: true, breakLine: true } },
      { text: "Standing-wave fading: at 12.5 cm wavelength, maxima and minima every ~6 cm", options: { bullet: true, breakLine: true } },
      { text: "Conclusion: distance from RSSI is unreliable indoors — so the design never uses it", options: { bullet: true, bold: true } },
    ], { x: 7.9, y: 3.9, w: 4.8, h: 2.8, fontSize: 14, paraSpaceAfter: 8, margin: 0 });
    footer(s, 8);
    s.addNotes("~50 s. Present this as a documented negative result. The signal does not fall off smoothly with distance indoors; two independent beacons showed the same residual pattern, which identifies the environment (multipath) as the cause. This justified classification by comparison rather than distance.");
  }

  // 9. Test 2
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Test 2 — Zone classification (Run 1)", "School, 24 Sep 2026 · 495 samples · 16 points · bedroom and medicine beacons shared one room");
    const stats = [["0", "cross-room errors", "never reported the wrong room across a wall", C.safe], ["100 %", "within 1 m", "of each beacon, once the tester had arrived", C.teal], ["23.2 %", "unresolved", "all at doorways, below the −88 dBm floor", C.amber]];
    stats.forEach(([big, lab, sub, col], i) => {
      const y = 1.9 + i * 1.62;
      card(s, 0.6, y, 5.3, 1.45);
      txt(s, big, { x: 0.8, y: y + 0.15, w: 2.2, h: 1.1, fontSize: 40, bold: true, color: col, valign: "middle", margin: 0 });
      txt(s, [{ text: lab, options: { bold: true, fontSize: 17, color: C.ink, breakLine: true } }, { text: sub, options: { fontSize: 13, color: C.muted } }], { x: 3.0, y: y + 0.2, w: 2.8, h: 1.1, valign: "middle", margin: 0 });
    });
    s.addChart(pres.charts.BAR, [{ name: "Recall", labels: ["Bedroom Wing", "Dining Hall (own room)", "Medicine Room"], values: [49, 85, 47] }], {
      x: 6.3, y: 1.8, w: 6.4, h: 3.6, barDir: "col", chartColors: [C.safe, C.teal, C.alert], showValue: true, dataLabelPosition: "outEnd",
      dataLabelFormatCode: "0\"%\"", dataLabelColor: C.ink, dataLabelFontSize: 13, valAxisMaxVal: 100, valAxisMinVal: 0,
      valAxisLabelColor: C.muted, catAxisLabelColor: C.text, valGridLine: { color: "E5E7EB", size: 0.5 }, catGridLine: { style: "none" },
      showLegend: false, showTitle: true, title: "Recall by zone", titleFontSize: 14, titleColor: C.ink,
    });
    txt(s, "Overall 56.2 % against a predicted 74 %: the shortfall is the two zones sharing one room (mid-room beacons within 2–4 dB). This motivated proximity mode.", { x: 6.3, y: 5.55, w: 6.4, h: 1.0, fontSize: 14, margin: 0 });
    pending(s, "Run 2 (single room, proximity mode) — add results", 6.3, 6.5, 6.4);
    footer(s, 9);
    s.addNotes("~70 s. Lead with the strongest result: zero cross-room errors — room-level detection across walls works, which is the deployment design. Then be candid: two zones in one room are separable only near their beacons, and every unresolved sample was at a doorway. Replace the yellow tag with the Run 2 numbers before the defense.");
  }

  // 10. Engineering findings
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "What building it taught us", "Measured problems, found with evidence, fixed at the cause");
    const f = [
      [I.bolt_a, "Boost converter ships at 17.64 V", "Destroyed one devkit. Now: measure 5.0 V before any board is connected — in the manual as a service step."],
      [I.radio_a, "Beacons 11 dB apart side by side", "4 dB apart when spaced out; swapping positions proved it was placement, not hardware."],
      [I.science_a, "Weak signal at 2.45 m", "An independent phone receiver isolated the fault to the transmitter; +3 → +9 dBm gave +6 dB."],
      [I.build_a, "Vendor library byte-order bugs", "Three reversed-byte defects in the iBeacon frame; each looked healthy in commercial scanner apps."],
    ];
    f.forEach(([img, h, b], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.15, y = 1.9 + row * 2.45;
      card(s, x, y, 5.95, 2.2);
      circleIcon(s, img, x + 0.3, y + 0.3, 0.75, C.alertTint);
      txt(s, h, { x: x + 1.25, y: y + 0.3, w: 4.5, h: 0.75, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: x + 0.3, y: y + 1.15, w: 5.4, h: 0.95, fontSize: 14, color: C.text, margin: 0 });
    });
    footer(s, 10);
    s.addNotes("~45 s. Choose two of these to tell briefly. The pattern to convey: each fault was diagnosed from measurements, not guessed.");
  }

  // 11. Demo
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    s.addText("Live demonstration", { x: 0.6, y: 0.45, w: 12, h: 0.8, fontFace: HF, fontSize: 34, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("Three proximity zones in this room · dashboard on screen", { x: 0.6, y: 1.2, w: 12, h: 0.45, fontFace: BF, fontSize: 16, italic: true, color: "9FC7CC", margin: 0, isTextBox: true });
    const steps = [["Bedroom Wing", "Safe · green card", C.safe], ["Dining Hall", "Zone change", C.safe], ["Open cabinet door", "Door alert", C.alert], ["Medicine Room", "Restricted alert + buzzer", C.alert], ["SOS press / hold", "Banner, then cancel", C.alert], ["Acknowledge", "Recorded with time", C.teal]];
    steps.forEach(([h, b, col], i) => {
      const x = 0.6 + i * 2.07;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.4, w: 1.85, h: 2.6, fill: { color: "123F4C" }, line: { color: col, width: 2 }, rectRadius: 0.1 });
      s.addShape(pres.shapes.OVAL, { x: x + 0.62, y: 2.6, w: 0.6, h: 0.6, fill: { color: col }, line: { color: col } });
      s.addText(String(i + 1), { x: x + 0.62, y: 2.6, w: 0.6, h: 0.6, fontFace: BF, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText([{ text: h, options: { bold: true, fontSize: 15, breakLine: true } }, { text: b, options: { fontSize: 12, color: "CFE8EA" } }], { x: x + 0.08, y: 3.35, w: 1.69, h: 1.5, fontFace: BF, color: C.white, align: "center", valign: "top", margin: 0, isTextBox: true });
    });
    s.addText("Stand ~1 m from each beacon for ~5 s. Backup if the radio misbehaves: scripted simulator on the same dashboard, stated as simulated.", { x: 0.6, y: 5.6, w: 12, h: 0.8, fontFace: BF, fontSize: 14, color: "9FC7CC", margin: 0, isTextBox: true });
    s.addNotes("~120 s (demo). Follow the Defense Demo Plan choreography. Before starting, state that zones in this single room are proximity areas; in deployment each zone is its own room.");
  }

  // 12. Conclusions
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Conclusions and recommendations");
    card(s, 0.6, 1.55, 6.0, 5.2);
    circleIcon(s, I.check, 0.9, 1.8, 0.65, C.safe);
    txt(s, "Achieved", { x: 1.7, y: 1.85, w: 4.6, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "Room-level zone detection across walls with zero cross-room errors", options: { bullet: true, breakLine: true } },
      { text: "Restricted-zone, door, SOS and battery alerts end to end", options: { bullet: true, breakLine: true } },
      { text: "Web dashboard: 38/38 automated checks, works on phones", options: { bullet: true, breakLine: true } },
      { text: "WiFi-down queueing with a local audible fallback", options: { bullet: true } },
    ], { x: 0.9, y: 2.65, w: 5.5, h: 3.9, fontSize: 15, paraSpaceAfter: 10, margin: 0 });
    card(s, 6.9, 1.55, 5.8, 5.2, C.alertTint);
    circleIcon(s, I.lightbulb, 7.2, 1.8, 0.65, C.alert);
    txt(s, "Limits and next steps", { x: 8.0, y: 1.85, w: 4.5, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "Runtime: 24 h target at risk with the boost + linear chain — measured value to be reported", options: { bullet: true, breakLine: true } },
      { text: "Replace with a buck-boost converter or a sub-400 mV LDO", options: { bullet: true, breakLine: true } },
      { text: "Doorway coverage gap: tune the floor or add beacons", options: { bullet: true, breakLine: true } },
      { text: "Validate heart rate against a reference device", options: { bullet: true } },
    ], { x: 7.2, y: 2.65, w: 5.3, h: 3.2, fontSize: 15, paraSpaceAfter: 10, margin: 0 });
    pending(s, "Insert measured runtime + Test 3 latency", 7.2, 6.0, 5.3);
    footer(s, 12);
    s.addNotes("~45 s. Be direct about the runtime gap: it follows from a sourcing constraint, the fix is known, and it belongs in Chapter 5 as a recommendation. Replace the yellow tag with the measured runtime.");
  }

  // 13. Q&A
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    circleIcon(s, I.pin_t, W / 2 - 0.6, 1.6, 1.2, C.white);
    s.addText("Thank you", { x: 0.6, y: 3.1, w: W - 1.2, h: 1.0, fontFace: HF, fontSize: 48, bold: true, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addText("Questions and answers", { x: 0.6, y: 4.1, w: W - 1.2, h: 0.6, fontFace: BF, fontSize: 22, color: "9FC7CC", align: "center", margin: 0, isTextBox: true });
    s.addText("Chester John B. Cirio  ·  Pathrish Anne R. Cruz  ·  Adviser: Engr. Glenn V. Magwili", { x: 0.6, y: 5.6, w: W - 1.2, h: 0.5, fontFace: BF, fontSize: 14, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addNotes("Likely questions: why not UWB/WiFi; why the runtime falls short; what happens when WiFi drops; how accurate the heart rate is; why perfboard (adviser approval, 24 Sep).");
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
