// TroDes defense deck, draft v0.3 (1 Oct 2026) — 10-minute slot on Thu 1 Oct.
// Usage: node deck.js <out.pptx>
// Order follows the defense briefing (26 Sep): brief background, design,
// constraints, standards, what we let go, results, then the live demo.
// Slides after "Thank you" are backups for questions.
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const md = require("react-icons/md");

const OUT = process.argv[2];
const FIG = (f) => path.join(__dirname, "figures", f);
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
    qr: md.MdQrCode2, gavel: md.MdGavel, lock: md.MdLock, cut: md.MdContentCut, timer: md.MdTimer, router: md.MdRouter,
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
  let slideNo = 0;
  const footer = (s) => s.addText(`TroDes  ·  ${++slideNo}`, { x: W - 2.6, y: 7.05, w: 2.0, h: 0.3, fontFace: BF, fontSize: 10, color: C.muted, align: "right", margin: 0, isTextBox: true });
  const pending = (s, text, x, y, w, h = 0.4) => s.addText(text, { x, y, w, h, fontFace: BF, fontSize: 12, bold: true, color: C.text, fill: { color: "FFF3B0" }, align: "center", valign: "middle", margin: 4, isTextBox: true });
  const arrow = (s, x, y, w, h, color = C.teal) =>
    s.addShape(pres.shapes.LINE, h < 0
      ? { x, y: y + h, w, h: -h, flipV: true, line: { color, width: 2.25, endArrowType: "triangle" } }
      : { x, y, w, h, line: { color, width: 2.25, endArrowType: "triangle" } });
  const tableSlide = (s, hdr, rows, colW, y = 1.85, fontSize = 14, rowH = 0.55) => {
    const h = hdr.map((t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.teal } } }));
    const b = rows.map((r, i) => r.map((c, j) => ({ text: c, options: { bold: j === 0, color: C.text, fill: { color: i % 2 ? C.white : C.tint } } })));
    s.addTable([h, ...b], { x: 0.6, y, w: 12.1, colW, fontFace: BF, fontSize, rowH, border: { type: "solid", pt: 0.75, color: C.line }, valign: "middle", margin: 0.08 });
  };

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
      { text: "Electronics Design · Section C1 · Mapúa University · 1 October 2026" },
    ], { x: 0.8, y: 5.3, w: 11.5, h: 1.3, fontFace: BF, fontSize: 16, color: C.white, margin: 0, paraSpaceAfter: 4, isTextBox: true });
    s.addNotes("~20 s. Introduce the team and the project in one sentence: an indoor system that tells caregivers where each resident is and raises alerts for restricted areas, SOS and low battery — running entirely on its own devices.");
    slideNo++;
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
    footer(s);
    s.addNotes("~30 s — brief background only. The facility needs to know WHERE residents are indoors and WHEN something is wrong. GPS does not work indoors, which is why the project moved from the original GPS/GSM design to BLE.");
  }

  // 3. Objectives
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Objectives", "Design and build an indoor localization and safety monitoring system for a care facility");
    const items = [
      [I.radio, "Zone detection", "Wearable identifies the resident's zone from fixed BLE beacons"],
      [I.door, "Restricted areas", "Alerts on entering a restricted zone or opening its door"],
      [I.sos, "SOS button", "1, 2 or 3 presses set the urgency; hold 3 s (ticks each second) to cancel"],
      [I.battery, "Power awareness", "Battery level reported, with low and critical alerts"],
      [I.heart, "Heart rate", "Displayed for information (not clinical)"],
      [I.web, "Caregiver dashboard", "Live on any phone — join by QR, no laptop needed"],
    ];
    items.forEach(([img, h, b], i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.6 + col * 4.1, y = 1.95 + row * 2.45;
      card(s, x, y, 3.8, 2.15);
      circleIcon(s, img, x + 0.3, y + 0.3, 0.75, C.teal);
      txt(s, h, { x: x + 1.2, y: y + 0.38, w: 2.45, h: 0.6, fontSize: 18, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: x + 0.3, y: y + 1.2, w: 3.25, h: 0.85, fontSize: 14, color: C.text, margin: 0 });
    });
    footer(s);
    s.addNotes("~30 s. These map one-to-one to the tests in Chapter 4. The Wi-Fi-down fallback is a design requirement too.");
  }

  // 4. Architecture — the hub
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "System architecture", "The door node is also the hub — no laptop, router or internet needed");
    s.addImage({ path: FIG("f1_arch_v2.png"), x: 0.45, y: 1.75, w: 12.45, h: 12.45 * 860 / 1860 });
    footer(s);
    s.addNotes("~60 s. Left panel is what we demonstrate: beacons only broadcast; the wearable picks the strongest beacon and reports over Wi-Fi to the door node, which also runs its own network SESEMSG, the alert rules and the dashboard. Phones join by scanning a QR code and the dashboard pops up. Right panel: the same devices can instead report to a computer on the building Wi-Fi — the wearable switches by itself. Remote viewing through a cloud relay was built and tested locally but is not deployed: hosting is an open decision with the adviser.");
  }

  // 5. Hardware
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Hardware", "Module-carrier design · etched single-sided wearable board · perfboard beacons and door node · PLA enclosures");
    card(s, 0.6, 1.9, 6.4, 4.9);
    circleIcon(s, I.watch, 0.9, 2.15, 0.7, C.teal);
    txt(s, "Wearable", { x: 1.75, y: 2.2, w: 4.9, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "ESP32-WROOM-32 devkit (BLE scan + Wi-Fi)", options: { bullet: true, breakLine: true } },
      { text: "MAX30102 heart rate · SOS button (GPIO 27)", options: { bullet: true, breakLine: true } },
      { text: "Piezo buzzer via 2N2222 + 1N4148 flyback (GPIO 25) · status LED", options: { bullet: true, breakLine: true } },
      { text: "Battery sense: 100 k / 100 k divider on GPIO 34", options: { bullet: true, breakLine: true } },
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
    txt(s, "ESP32 devkits on 5 V USB power, iBeacon at +9 dBm every 100 ms, identical height and orientation.", { x: 7.6, y: 2.95, w: 4.9, h: 1.1, fontSize: 14, margin: 0 });
    card(s, 7.3, 4.5, 5.4, 2.3, C.alertTint);
    circleIcon(s, I.router, 7.6, 4.75, 0.7, C.alert);
    txt(s, "Door node = hub", { x: 8.45, y: 4.8, w: 4.0, h: 0.55, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, "ESP32 + reed switch on GPIO 18 (heartbeat every 30 s). Also runs the SESEMSG Wi-Fi network and serves the dashboard.", { x: 7.6, y: 5.55, w: 4.9, h: 1.15, fontSize: 14, margin: 0 });
    footer(s);
    s.addNotes("~45 s. All three device types share the ESP32 and one toolchain. Power chain: the boost-to-5 V topology was chosen because no suitable low-dropout regulator could be sourced in time; the cost is runtime (see conclusions). Hold up the wearable and the door node here.");
  }

  // 6. How it works — zone + SOS
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "How it decides — and how it calls for help", "Compare beacons, never estimate distance · the button carries the urgency");
    card(s, 0.6, 1.8, 6.0, 5.0);
    circleIcon(s, I.radio, 0.9, 2.05, 0.7, C.teal);
    txt(s, "Zone, every 200 ms", { x: 1.75, y: 2.1, w: 4.6, h: 0.6, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "Only the project's iBeacon UUID counts", options: { bullet: true, breakLine: true } },
      { text: "Smooth each beacon's RSSI (EMA, α = 0.4); ignore below −88 dBm", options: { bullet: true, breakLine: true } },
      { text: "Strongest beacon wins — if it leads by 5 dB:", options: { bullet: true, breakLine: true } },
      { text: "for 0.4 s when it leads by 10 dB or more (clear move)", options: { bullet: { indent: 18 }, indentLevel: 1, breakLine: true } },
      { text: "for 1.6 s when signals are close (no flicker)", options: { bullet: { indent: 18 }, indentLevel: 1, breakLine: true } },
      { text: "No beacon for ~8.5 s → \"location unknown\" (once; clears itself)", options: { bullet: true, breakLine: true } },
      { text: "Restricted zone → buzzer + critical alert", options: { bullet: true } },
    ], { x: 0.9, y: 2.95, w: 5.5, h: 3.7, fontSize: 15, paraSpaceAfter: 6, margin: 0 });
    card(s, 6.9, 1.8, 5.8, 5.0, C.alertTint);
    circleIcon(s, I.sos, 7.2, 2.05, 0.7, C.alert);
    txt(s, "SOS in three levels", { x: 8.05, y: 2.1, w: 4.4, h: 0.6, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "middle" });
    const lv = [["1 press", "Needs assistance"], ["2 presses", "URGENT – please come now"], ["3 presses", "EMERGENCY – immediate help"], ["Hold 3 s", "Cancel (ticks each second; phones show green)"]];
    lv.forEach(([a, b], i) => {
      const y = 2.95 + i * 0.62;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.2, y, w: 1.45, h: 0.48, fill: { color: i < 3 ? C.alert : C.muted }, line: { color: i < 3 ? C.alert : C.muted }, rectRadius: 0.08 });
      txt(s, a, { x: 7.2, y, w: 1.45, h: 0.48, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
      txt(s, b, { x: 8.8, y, w: 3.7, h: 0.48, fontSize: 14, color: C.text, valign: "middle", margin: 0 });
    });
    txt(s, "Phones show the message and sound an alarm until Acknowledge — which also clears the wearable. More presses escalate an open SOS.", { x: 7.2, y: 5.55, w: 5.3, h: 1.1, fontSize: 13, color: C.muted, margin: 0 });
    footer(s);
    s.addNotes("~60 s. Left: classification compares beacons and never uses a distance estimate — Test 1 shows why. The adaptive confirmation came from a field observation: people near the wearable made two similar signals alternate. Right: the SOS patterns were a team addition; the acknowledgement loop means the resident hears when help is on the way.");
  }

  // 7. Constraints and design decisions
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Design constraints and decisions", "Each chosen against its alternatives — supports SDG 3, Good Health and Well-Being");
    tableSlide(s, ["Constraint", "Chosen", "Alternatives considered"], [
      ["Localization", "BLE beacons + ESP32 radio (weighted score 4.30)", "UWB 3.40 (cost), Wi-Fi RSSI 3.35, RFID 2.75, GPS 2.25"],
      ["Backend hosting", "Door node as stand-alone hub (no laptop, no internet)", "Laptop server (kept as fallback); cloud (open decision)"],
      ["Caregiver interface", "Web page on any phone, joined by QR", "Native mobile app — per-platform effort, installation"],
      ["Security and privacy", "WPA2 network + passcode with lock-out; data on site", "Open network; cloud storage of health data"],
      ["Wearable power", "Boost 5 V → devkit regulator", "Low-dropout regulator — none sourceable in time"],
      ["Fabrication", "Etched single-sided wearable board; beacons and door node on perfboard (approved 24 Sep)", "All perfboard; all etched boards"],
    ], [2.5, 4.9, 4.7], 1.85, 14, 0.62);
    footer(s);
    s.addNotes("~40 s. The weighted decision matrix is Table 3.3 of the paper. Backend hosting is the newest decision: running the server inside the door node removes the laptop and the internet from the list of things that can fail.");
  }

  // 8. Standards
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Applicable standards and regulations", "What the design has to respect");
    const items = [
      [I.battery, "IEC 62133-2", "Safety of portable lithium cells — the wearable's Li-Po battery"],
      [I.bolt, "IEC 62368-1", "Safety of ICT equipment — chargers, enclosures, touch temperature"],
      [I.radio, "Bluetooth Core Specification", "BLE advertising (formerly IEEE 802.15.1) — beacons and wearable"],
      [I.wifi, "IEEE 802.11 (WPA2)", "Wi-Fi link and the hub's protected network"],
      [I.gavel, "RA 10173 — Data Privacy Act of 2012", "Location and heart rate are personal and health data: passcode, on-site storage, acknowledgement log"],
    ];
    items.forEach(([img, h, b], i) => {
      const y = 1.8 + i * 1.02;
      card(s, 0.6, y, 12.1, 0.88);
      circleIcon(s, img, 0.8, y + 0.1, 0.68, C.teal);
      txt(s, h, { x: 1.7, y: y + 0.08, w: 4.3, h: 0.72, fontSize: 18, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: 6.0, y: y + 0.08, w: 6.5, h: 0.72, fontSize: 14, color: C.text, margin: 0, valign: "middle" });
    });
    footer(s);
    s.addNotes("~30 s. The Data Privacy Act matters because the system handles location and heart rate: that is why the dashboard has a passcode and why data stays on the facility's own equipment by default.");
  }

  // 9. What we let go
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "What we let go", "Removed or deferred — each with a reason");
    tableSlide(s, ["Feature", "Why", "Status"], [
      ["GPS + outdoor geofencing, GSM (SIM800L)", "Indoor failure; 2G sunset in the Philippines", "Removed (adviser)"],
      ["Fall detection (accelerometer)", "Priority on localization and SOS", "Removed (adviser)"],
      ["Native mobile app", "Browser page works on every phone", "Not developed"],
      ["Etched PCB · low-dropout regulator", "Schedule and part availability", "Perfboard · boost converter"],
      ["Measured 24 h battery runtime", "No cell or fuel gauge available", "Calculated only (~20 h, 2000 mAh cell)"],
      ["Remote viewing · push notifications", "Needs cloud hosting (open decision)", "Built and tested locally; further study"],
    ], [4.2, 4.5, 3.4], 1.85, 14, 0.62);
    footer(s);
    s.addNotes("~30 s. State these plainly — the panel asked for them. The remote relay exists and passed 15 of 15 local tests, but deploying health data to a cloud service is a decision for the adviser and the facility.");
  }

  // 10. Test 1
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
    footer(s);
    s.addNotes("~40 s. A documented negative result: the signal does not fall off smoothly with distance indoors; two independent beacons showed the same residual pattern, which identifies the environment (multipath) as the cause. It justifies classification by comparison rather than distance.");
  }

  // 11. Results on the final firmware (30 Sep)
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Results", "Measured 24 Sep – 1 Oct 2026 · values from logged captures only");
    const cards = [
      [I.radio, "Zone accuracy (Run 1)", "0 cross-room errors · 56.2 % where two zones shared a room"],
      [I.timer, "SOS delivery time", "median 295 ms · max 408 ms (n = 6)"],
      [I.heart, "Heart rate vs oximeter", "+3 and +0.5 bpm (2 readings, preliminary)"],
      [I.door, "Door openings", "4 of 4 detected (29 Sep: 3 · demo 30 Sep: 1)"],
      [I.wifi, "Hub: 4 phones polling", "median 32 ms · worst 60 ms"],
      [I.check, "Dashboard self-test", "38 / 38 checks · hub 17 / 17"],
    ];
    cards.forEach(([img, h, b], i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.6 + col * 4.1, y = 1.95 + row * 2.45;
      card(s, x, y, 3.8, 2.15);
      circleIcon(s, img, x + 0.3, y + 0.3, 0.7, i < 4 ? C.teal : C.safe);
      txt(s, h, { x: x + 1.15, y: y + 0.3, w: 2.5, h: 0.7, fontSize: 16, bold: true, color: C.ink, margin: 0, valign: "middle" });
      if (i < 4) pending(s, b, x + 0.3, y + 1.25, 3.2, 0.6);
      else txt(s, b, { x: x + 0.3, y: y + 1.25, w: 3.2, h: 0.6, fontSize: 18, bold: true, color: C.safe, margin: 0, valign: "middle" });
    });
    footer(s);
    s.addNotes("~60 s. Fill the four yellow cards from the 30 September captures (test_day_report.py and analyze_zone_accuracy.py). Lead with the strongest number. Be candid about any remaining errors and where they occur.");
  }

  // 12. Demo
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    s.addText("Live demonstration", { x: 0.6, y: 0.45, w: 12, h: 0.8, fontFace: HF, fontSize: 34, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("Scan the card — join SESEMSG — the dashboard opens on your phone (passcode on the card)", { x: 0.6, y: 1.2, w: 12, h: 0.45, fontFace: BF, fontSize: 16, italic: true, color: "9FC7CC", margin: 0, isTextBox: true });
    const steps = [["Join by QR", "Dashboard pops up", C.teal], ["Walk the zones", "Bedroom → Dining", C.safe], ["Medicine Room", "Restricted alert + buzzer", C.alert], ["Open the door", "Door alert", C.alert], ["SOS 1 → 3 presses", "Alarm on phones, escalates", C.alert], ["Acknowledge", "Wearable clears", C.teal]];
    steps.forEach(([h, b, col], i) => {
      const x = 0.6 + i * 2.07;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.4, w: 1.85, h: 2.6, fill: { color: "123F4C" }, line: { color: col, width: 2 }, rectRadius: 0.1 });
      s.addShape(pres.shapes.OVAL, { x: x + 0.62, y: 2.6, w: 0.6, h: 0.6, fill: { color: col }, line: { color: col } });
      s.addText(String(i + 1), { x: x + 0.62, y: 2.6, w: 0.6, h: 0.6, fontFace: BF, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText([{ text: h, options: { bold: true, fontSize: 15, breakLine: true } }, { text: b, options: { fontSize: 12, color: "CFE8EA" } }], { x: x + 0.08, y: 3.35, w: 1.69, h: 1.5, fontFace: BF, color: C.white, align: "center", valign: "top", margin: 0, isTextBox: true });
    });
    s.addText("Fallback: laptop server on the facility Wi-Fi (the wearable switches by itself) · backup video of the full demo.", { x: 0.6, y: 5.6, w: 12, h: 0.8, fontFace: BF, fontSize: 14, color: "9FC7CC", margin: 0, isTextBox: true });
    footer(s);
    s.addNotes("~150 s — the heart of the presentation. Hand out the access cards first. State that zones in this single room stand in for separate rooms. If the hub misbehaves, switch to the laptop fallback or play the backup video, and say which one it is.");
  }

  // 13. Conclusions
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Conclusions and recommendations");
    card(s, 0.6, 1.55, 6.0, 5.2);
    circleIcon(s, I.check, 0.9, 1.8, 0.65, C.safe);
    txt(s, "Achieved", { x: 1.7, y: 1.85, w: 4.6, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "Room-level zone detection; zero cross-room errors across walls", options: { bullet: true, breakLine: true } },
      { text: "Restricted-zone, door, 3-level SOS and battery alerts end to end", options: { bullet: true, breakLine: true } },
      { text: "Runs with no laptop or internet: the door node is the hub", options: { bullet: true, breakLine: true } },
      { text: "Dashboard on any phone: 38/38 checks; hub 17/17", options: { bullet: true, breakLine: true } },
      { text: "Network-down queueing with an audible local fallback", options: { bullet: true } },
    ], { x: 0.9, y: 2.65, w: 5.5, h: 3.9, fontSize: 15, paraSpaceAfter: 10, margin: 0 });
    card(s, 6.9, 1.55, 5.8, 5.2, C.alertTint);
    circleIcon(s, I.lightbulb, 7.2, 1.8, 0.65, C.alert);
    txt(s, "Limits and next steps", { x: 8.0, y: 1.85, w: 4.5, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "Measure the runtime; replace the boost + linear chain with a buck-boost or sub-400 mV regulator (≈ 54 h calculated, 2000 mAh)", options: { bullet: true, breakLine: true } },
      { text: "Deploy the remote relay and push notifications once hosting is decided", options: { bullet: true, breakLine: true } },
      { text: "Doorway coverage: tune the floor or add beacons", options: { bullet: true, breakLine: true } },
      { text: "Validate heart rate on more people against clinical equipment", options: { bullet: true, breakLine: true } },
      { text: "Show charging on the dashboard (USB-input sense); fuel gauge for accurate %", options: { bullet: true } },
    ], { x: 7.2, y: 2.65, w: 5.3, h: 3.9, fontSize: 15, paraSpaceAfter: 10, margin: 0 });
    footer(s);
    s.addNotes("~40 s. Be direct about the runtime gap: it follows from a sourcing constraint, the fix is known, and it belongs in Chapter 5 as a recommendation.");
  }

  // 14. Q&A
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    circleIcon(s, I.pin_t, W / 2 - 0.6, 1.6, 1.2, C.white);
    s.addText("Thank you", { x: 0.6, y: 3.1, w: W - 1.2, h: 1.0, fontFace: HF, fontSize: 48, bold: true, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addText("Questions and answers", { x: 0.6, y: 4.1, w: W - 1.2, h: 0.6, fontFace: BF, fontSize: 22, color: "9FC7CC", align: "center", margin: 0, isTextBox: true });
    s.addText("Chester John B. Cirio  ·  Pathrish Anne R. Cruz  ·  Adviser: Engr. Glenn V. Magwili", { x: 0.6, y: 5.6, w: W - 1.2, h: 0.5, fontFace: BF, fontSize: 14, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addNotes("Likely questions: why not UWB or Wi-Fi RSSI; why the runtime falls short; what happens when Wi-Fi or the hub fails (queue + chirp; laptop fallback); how many phones the hub supports (7 + the wearable); how accurate the heart rate is; why perfboard (adviser approval, 24 Sep); where the data is stored (on site; RA 10173).");
    slideNo++;
  }

  // Backup A. Test 2 Run 1
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Backup — Test 2, Run 1 (earlier firmware)", "School, 24 Sep 2026 · 495 samples · 16 points · bedroom and medicine beacons shared one room");
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
    txt(s, "Overall 56.2 % against a predicted 74 %: the shortfall is the two zones sharing one room. It led to the 5 dB hysteresis and adaptive confirmation of the final firmware.", { x: 6.3, y: 5.55, w: 6.4, h: 1.0, fontSize: 14, margin: 0 });
    footer(s);
    s.addNotes("Backup for questions about accuracy history.");
  }

  // Backup B. Engineering findings
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Backup — what building it taught us", "Measured problems, found with evidence, fixed at the cause");
    const f = [
      [I.bolt_a, "Boost converter ships at 17.64 V", "Destroyed one devkit. Now: measure 5.0 V before any board is connected — a service step in the manual."],
      [I.radio_a, "Beacons 11 dB apart side by side", "4 dB apart when spaced; swapping positions proved it was placement, not hardware."],
      [I.wifi_a, "Hub stalled by one slow phone", "A blocking write to a phone in power-save held up everyone; replies are now sent without blocking."],
      [I.sos_a, "A resent SOS became a second alert", "The wearable stayed in SOS mode after Acknowledge; repeated reports are now merged."],
    ];
    f.forEach(([img, h, b], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.15, y = 1.9 + row * 2.45;
      card(s, x, y, 5.95, 2.2);
      circleIcon(s, img, x + 0.3, y + 0.3, 0.75, C.alertTint);
      txt(s, h, { x: x + 1.25, y: y + 0.3, w: 4.5, h: 0.75, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: x + 0.3, y: y + 1.15, w: 5.4, h: 0.95, fontSize: 14, color: C.text, margin: 0 });
    });
    footer(s);
    s.addNotes("Backup. Each fault was diagnosed from measurements, not guessed.");
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
