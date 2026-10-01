// TroDes defense deck, v0.5 (1 Oct 2026), checked against the final paper (Rev 8) — 10-minute slot on Thu 1 Oct,
// live demo included in the 10 minutes.
// Usage: node deck.js <out.pptx>
// Order: introduction, brief background, system architecture, technical aspect
// (hardware and enclosures, how it decides), constraints, standards, SDG, what
// we let go, results, then the live demo — the team's outline plus the
// adviser's briefing (Defense_Day_Checklist.md). Each slide's notes carry its
// time and a running clock. Slides after "Thank you" are backups for questions.
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const md = require("react-icons/md");

const OUT = process.argv[2];
const FIG = (f) => path.join(__dirname, "figures", f);
const HW = (f) => path.join(__dirname, "..", "..", "hardware", f);
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

// Renders and screenshots are downscaled to JPEG so the deck stays small.
async function photo(file, maxW = 1400) {
  const buf = await sharp(file).resize({ width: maxW, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
  const { width, height } = await sharp(buf).metadata();
  return { data: "image/jpeg;base64," + buf.toString("base64"), ar: width / height };
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
    groups: md.MdGroups, home: md.MdApartment, health: md.MdHealthAndSafety,
  };
  for (const [k, comp] of Object.entries(want)) {
    I[k] = await icon(comp, C.white);
    I[k + "_t"] = await icon(comp, C.teal);
    I[k + "_a"] = await icon(comp, C.alert);
  }
  const P = {
    phone: await photo(FIG("f4_dashboard_phone.png"), 900),
    pcb: await photo(FIG("a_pcb_3d.png")),
    wearCase: await photo(HW("enclosures/out_revB/RevB_Closed.png")), // Rev B, the printed case
    nodeCase: await photo(FIG("Node_Enclosures_Closed.png")),
  };

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
  // Fit an image inside a box, centred, keeping its aspect ratio.
  const placeImg = (s, im, x, y, w, h) => {
    let iw = w, ih = w / im.ar;
    if (ih > h) { ih = h; iw = h * im.ar; }
    s.addImage({ data: im.data, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
  };
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
    s.addText("An Indoor BLE Based Localization and Safety Monitoring System for a Home for the Aged", { x: 0.8, y: 3.8, w: 11.5, h: 0.5, fontFace: BF, fontSize: 18, italic: true, color: "9FC7CC", margin: 0, isTextBox: true });
    s.addText([
      { text: "Chester John B. Cirio  ·  Pathrish Anne R. Cruz", options: { bold: true, breakLine: true } },
      { text: "Adviser: Engr. Glenn V. Magwili", options: { breakLine: true } },
      { text: "Electronics Design · Section C1 · Mapúa University · 1 October 2026" },
    ], { x: 0.8, y: 5.3, w: 11.5, h: 1.3, fontFace: BF, fontSize: 16, color: C.white, margin: 0, paraSpaceAfter: 4, isTextBox: true });
    s.addNotes("~15 s (0:00–0:15). Names, adviser, project title. Nothing else — the introduction is the next slide.\n\nTIME PLAN (10 min, demo included): intro 0:15 · background 0:45 · architecture 1:10 · hardware 1:50 · how it decides 2:40 · constraints 3:20 · standards 3:50 · SDG 4:10 · let go 4:30 · results 4:55 · DEMO 5:25–8:55 · conclusions 8:55 · Q&A 9:20. If the demo slide is not up by 5:30, skip straight to it.");
    slideNo++;
  }

  // 2. Introduction
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Introduction", "TroDes tells caregivers where each resident is indoors, and calls them when something is wrong");
    const rows = [
      [I.watch, "Wearable (worn on the belt)", "Finds its zone from BLE beacons · SOS button with three urgency levels · heart rate and battery level"],
      [I.radio, "Beacons and door sensor", "One beacon per zone · a magnetic reed switch on the restricted door · the door node also runs the network and the dashboard"],
      [I.qr, "Caregivers' phones", "Scan a card to join · live zones, alerts and acknowledgement · no app, no laptop, no internet"],
    ];
    rows.forEach(([img, h, b], i) => {
      const y = 1.95 + i * 1.32;
      card(s, 0.6, y, 8.6, 1.15);
      circleIcon(s, img, 0.85, y + 0.2, 0.75, C.teal);
      txt(s, h, { x: 1.85, y: y + 0.12, w: 7.15, h: 0.4, fontSize: 18, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: 1.85, y: y + 0.52, w: 7.15, h: 0.55, fontSize: 14, color: C.text, margin: 0 });
    });
    txt(s, [
      { text: "Objectives  ", options: { bold: true, color: C.teal } },
      { text: "zone from BLE beacons · door alerts at restricted areas · SOS with alert and dismiss · battery and heart rate · web caregiver interface · fallback when the network is down" },
    ], { x: 0.6, y: 6.0, w: 8.6, h: 0.75, fontSize: 14, margin: 0 });
    placeImg(s, P.phone, 9.75, 1.75, 2.95, 5.0);
    txt(s, "Caregiver dashboard on a phone", { x: 9.6, y: 6.78, w: 3.25, h: 0.28, fontSize: 11, italic: true, color: C.muted, align: "center", margin: 0 });
    footer(s);
    s.addNotes("~30 s (0:15–0:45). One sentence: TroDes is an indoor system that tells caregivers, on their phones, which zone each resident is in and raises alerts for restricted areas, an opened door, SOS calls and low battery. Then name the three parts left to right. The objectives line is paper Section 1.5, objectives 1–6; objective 7 is the evaluation (Chapter 4).");
  }

  // 3. Background
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Background", "Why indoor localization — and how the design got here");
    card(s, 0.6, 1.85, 6.2, 4.9, C.alertTint);
    txt(s, "The need", { x: 0.9, y: 2.05, w: 5.6, h: 0.45, fontSize: 20, bold: true, color: C.ink, margin: 0 });
    const need = [
      [I.eye, "Supervision gaps", "Caregivers cannot watch every resident, every minute — especially at night"],
      [I.door, "Restricted areas", "Residents with cognitive decline may enter places such as the medicine room unnoticed"],
      [I.alarm, "Help that is not heard", "A resident who needs help may be unable to reach a caregiver or a call point"],
    ];
    txt(s, [
      { text: "5.4\u00A0% of the household population — about 5.86 million people — were 65 or older", options: { bold: true, color: C.alert, breakLine: true } },
      { text: "2020 Census of Population and Housing, PSA [1]", options: { fontSize: 11, italic: true, color: C.muted } },
    ], { x: 0.9, y: 2.5, w: 5.7, h: 0.75, fontSize: 13, margin: 0 });
    need.forEach(([img, h, b], i) => {
      const y = 3.4 + i * 1.1;
      circleIcon(s, img, 0.9, y, 0.62, C.alert);
      txt(s, h, { x: 1.75, y: y - 0.04, w: 4.85, h: 0.36, fontSize: 15, bold: true, color: C.ink, margin: 0 });
      txt(s, b, { x: 1.75, y: y + 0.3, w: 4.85, h: 0.6, fontSize: 12.5, color: C.text, margin: 0 });
    });
    txt(s, "How the design got here", { x: 7.2, y: 2.05, w: 5.5, h: 0.45, fontSize: 20, bold: true, color: C.ink, margin: 0 });
    const path3 = [
      ["Original proposal", "GPS geofencing · GSM (SIM800L) alerts · fall detection", C.muted],
      ["Adviser review", "GPS fails indoors · 2G sunset in the Philippines · priority on localization", C.amber],
      ["TroDes as built", "Indoor BLE zones, one beacon per room · alerts on a phone web page", C.teal],
    ];
    path3.forEach(([h, b, col], i) => {
      const y = 2.65 + i * 1.4;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.2, y, w: 5.5, h: 1.05, fill: { color: C.white }, line: { color: col, width: 2 }, rectRadius: 0.1 });
      txt(s, h, { x: 7.45, y: y + 0.1, w: 5.0, h: 0.38, fontSize: 16, bold: true, color: col, margin: 0 });
      txt(s, b, { x: 7.45, y: y + 0.48, w: 5.0, h: 0.52, fontSize: 13, color: C.text, margin: 0 });
      if (i < path3.length - 1) arrow(s, 9.95, y + 1.07, 0, 0.3);
    });
    footer(s);
    s.addNotes("~25 s (0:45–1:10). Brief only — the adviser asked for it. The facility needs to know WHERE residents are indoors and WHEN something is wrong. The first proposal used GPS and GSM; GPS does not work indoors and 2G is being retired, so with the adviser the project moved to indoor BLE zones. The census figure is the paper's reference [1] (PSA, 2020 Census of Population and Housing).");
  }

  // 4. Architecture — the hub
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "System architecture", "The door node is also the hub — no laptop, router or internet needed");
    s.addImage({ path: FIG("f1_arch_v2.png"), x: (W - 5.15 * 1860 / 860) / 2, y: 1.75, w: 5.15 * 1860 / 860, h: 5.15 }); // fits above the footer
    footer(s);
    s.addNotes("~40 s (1:10–1:50). Left panel is what we demonstrate: beacons only broadcast; the wearable picks the strongest beacon and reports over Wi-Fi to the door node, which also runs its own network SESEMSG, the alert rules and the dashboard. Phones join by scanning a QR code and the dashboard pops up. Right panel: the same devices can instead report to a computer on the building Wi-Fi — the wearable switches by itself. Remote viewing through a cloud relay was built and tested locally but is not deployed: hosting is an open decision with the adviser.");
  }

  // 5. Hardware and enclosures
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Hardware and enclosures", "Wearable on an etched single-sided board · beacons and door node on perfboard · 3-D printed PLA cases");
    card(s, 0.6, 1.8, 7.55, 5.05);
    circleIcon(s, I.watch, 0.85, 1.95, 0.6, C.teal);
    txt(s, "Wearable — etched board, Rev C3", { x: 1.6, y: 1.97, w: 6.3, h: 0.55, fontSize: 19, bold: true, color: C.ink, margin: 0, valign: "middle" });
    placeImg(s, P.pcb, 0.85, 2.65, 3.45, 2.1);
    placeImg(s, P.wearCase, 4.45, 2.65, 3.45, 2.1);
    txt(s, "Single-sided board, 69\u00A0×\u00A066\u00A0mm (DRC clean)", { x: 0.85, y: 4.77, w: 3.45, h: 0.25, fontSize: 10, italic: true, color: C.muted, align: "center", margin: 0 });
    txt(s, "Belt-worn case (Rev B)", { x: 4.45, y: 4.77, w: 3.45, h: 0.25, fontSize: 10, italic: true, color: C.muted, align: "center", margin: 0 });
    txt(s, [
      { text: "ESP32 devkit and MAX30102 on headers · SOS button · buzzer · status LED", options: { bullet: true, breakLine: true } },
      { text: "Battery % from a 100 k / 100 k divider on GPIO 34 — the MAX17043 socket is empty (gauge not delivered)", options: { bullet: true, breakLine: true } },
      { text: "Li-Po 2000 mAh → TP4056 charger → MT3608 boost to 5 V, wired in a power deck under the board", options: { bullet: true, breakLine: true } },
      { text: "PLA case 74 × 74 × 45.8 mm: snap lid, sliding belt clip, charge-light window, rounded edges", options: { bullet: true } },
    ], { x: 0.85, y: 5.1, w: 7.1, h: 1.7, fontSize: 12.5, paraSpaceAfter: 3, margin: 0 });
    card(s, 8.4, 1.8, 4.3, 5.05, C.alertTint);
    circleIcon(s, I.router, 8.65, 1.95, 0.6, C.alert);
    txt(s, "Beacons and door node", { x: 9.4, y: 1.97, w: 3.2, h: 0.55, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: "middle" });
    placeImg(s, P.nodeCase, 8.65, 2.65, 3.8, 2.1);
    txt(s, "Snap-lid boxes, zone name on the lid", { x: 8.65, y: 4.77, w: 3.8, h: 0.25, fontSize: 10, italic: true, color: C.muted, align: "center", margin: 0 });
    txt(s, [
      { text: "ESP32 soldered to a 5\u00A0×\u00A07\u00A0cm perfboard; 5\u00A0V USB charger", options: { bullet: true, breakLine: true } },
      { text: "Three beacons: +9 dBm, every 100\u00A0ms", options: { bullet: true, breakLine: true } },
      { text: "Door node: reed switch on GPIO 18, and the SESEMSG hub", options: { bullet: true, breakLine: true } },
      { text: "PLA boxes, 55\u00A0×\u00A075\u00A0×\u00A026\u00A0mm", options: { bullet: true } },
    ], { x: 8.65, y: 5.1, w: 3.85, h: 1.7, fontSize: 12.5, paraSpaceAfter: 3, margin: 0 });
    footer(s);
    s.addNotes("~50 s (1:50–2:40). Hold up the wearable, then a beacon and the door node. Only the wearable is an etched board; the beacons and the door node are perfboard (adviser-approved). The fuel-gauge socket is empty because the MAX17043 was not delivered — battery level comes from the divider, and the firmware for the gauge is ready. The boost-to-5 V chain was used because no low-dropout regulator could be sourced in time; the cost is runtime. If asked whether it runs on the battery: on 30 Sep it ran from USB only (a power-path fault, paper 4.12); on 1 Oct the battery-sense line read 3.90–3.92 V, but operation from the cell under load was not re-measured. The case was revised after fitting (Rev B): taller for the power wiring, snap hooks, belt clip, a window to see the charging light, rounded edges for elderly wearers.");
  }

  // 6. Technical aspect — zone + SOS
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
    const lv = [["1 press", "Needs assistance"], ["2 presses", "URGENT – please come now"], ["3 presses", "EMERGENCY – immediate help needed"], ["Hold 3 s", "Cancel (ticks each second; phones show green)"]];
    lv.forEach(([a, b], i) => {
      const y = 2.95 + i * 0.62;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.2, y, w: 1.45, h: 0.48, fill: { color: i < 3 ? C.alert : C.muted }, line: { color: i < 3 ? C.alert : C.muted }, rectRadius: 0.08 });
      txt(s, a, { x: 7.2, y, w: 1.45, h: 0.48, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
      txt(s, b, { x: 8.8, y, w: 3.7, h: 0.48, fontSize: 14, color: C.text, valign: "middle", margin: 0 });
    });
    txt(s, "Phones show the message and sound an alarm until Acknowledge — which also clears the wearable. More presses escalate an open SOS.", { x: 7.2, y: 5.55, w: 5.3, h: 1.1, fontSize: 13, color: C.muted, margin: 0 });
    footer(s);
    s.addNotes("~40 s (2:40–3:20). Left: classification compares beacons and never uses a distance estimate — Test 1 shows why. The adaptive confirmation came from a field observation: people near the wearable made two similar signals alternate. Right: the SOS patterns were a team addition; the acknowledgement loop means the resident hears when help is on the way.");
  }

  // 7. Design constraints
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Design constraints", "What limited the design, and what was chosen against the alternatives");
    tableSlide(s, ["Constraint", "Chosen", "Alternatives considered"], [
      ["Indoor localization", "BLE beacons + ESP32 radio (weighted score 4.30)", "UWB 3.40, Wi-Fi RSSI 3.35, RFID 2.75, GPS 2.25"],
      ["Cost", "Commonly available modules — ₱4,774 bill of materials (₱2,265 of it estimated)", "UWB: scored 2 of 5 on cost per zone"],
      ["Power (24 h target)", "2000 mAh Li-Po, boost to 5 V → devkit regulator: ≈ 20 h calculated, not measured", "Low-dropout regulator — none sourceable in time"],
      ["Backend hosting", "Door node as stand-alone hub (no laptop, no internet)", "Laptop server (kept as fallback); cloud (open decision)"],
      ["Caregiver interface", "Web page on any phone, joined by QR", "Native mobile app — per-platform effort, installation"],
      ["Security and privacy", "WPA2 network + passcode with lock-out; data on site", "Open network; cloud storage of health data"],
      ["Fabrication", "Etched single-sided wearable board; beacons and door node on perfboard (adviser-approved)", "All perfboard; all etched boards"],
    ], [2.45, 5.25, 4.4], 1.8, 13, 0.62);
    footer(s);
    s.addNotes("~30 s (3:20–3:50). Read the left column and pick two rows to explain: localization (the weighted matrix is in Section 3.12 of the paper) and power (the runtime is calculated, not measured — say so before the panel asks). The cost total includes ₱2,265 of supplier-listing estimates for parts with no receipt.");
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
    s.addNotes("~20 s (3:50–4:10). The Data Privacy Act matters because the system handles location and heart rate: that is why the dashboard has a passcode and why data stays on the facility's own equipment by default.");
  }

  // 9. SDG
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Sustainable Development Goal", "TroDes contributes to SDG 3 — Good Health and Well-Being");
    const G = "4C9F38"; // SDG 3 green
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.85, w: 3.7, h: 3.7, fill: { color: G }, line: { color: G }, rectRadius: 0.15 });
    s.addText("SDG", { x: 0.85, y: 2.0, w: 1.5, h: 0.5, fontFace: BF, fontSize: 20, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("3", { x: 0.85, y: 2.3, w: 1.6, h: 1.6, fontFace: HF, fontSize: 96, bold: true, color: C.white, margin: 0, valign: "middle", isTextBox: true });
    s.addImage({ data: I.health, x: 2.75, y: 2.55, w: 1.25, h: 1.25 });
    s.addText("GOOD HEALTH AND WELL-BEING", { x: 0.85, y: 4.15, w: 3.2, h: 1.1, fontFace: BF, fontSize: 20, bold: true, color: C.white, margin: 0, valign: "top", isTextBox: true });
    txt(s, "“Ensure healthy lives and promote well-being for all at all ages”", { x: 0.6, y: 5.75, w: 3.7, h: 0.9, fontSize: 13, italic: true, color: C.muted, margin: 0 });
    const rows = [
      [I.person, "Residents", "Can call for help from anywhere in the facility, and are not left to enter unsafe areas unnoticed"],
      [I.groups, "Caregivers", "Less need for continuous watching; an SOS reaches the hub in a median 295\u00A0ms (n\u00A0=\u00A06), and phones show it at the next 1\u00A0s refresh"],
      [I.home, "The facility", "Subscription-free, built from commonly available parts and maintained on site; the data stays on site"],
    ];
    rows.forEach(([img, h, b], i) => {
      const y = 1.85 + i * 1.6;
      card(s, 4.7, y, 8.0, 1.4);
      circleIcon(s, img, 4.95, y + 0.3, 0.8, G);
      txt(s, h, { x: 6.0, y: y + 0.15, w: 6.5, h: 0.42, fontSize: 18, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: 6.0, y: y + 0.58, w: 6.5, h: 0.75, fontSize: 14, color: C.text, margin: 0 });
    });
    txt(s, "The decision-matrix weights reflect the needs of a home for the aged (paper, Section 3.12).", { x: 4.7, y: 6.6, w: 8.0, h: 0.35, fontSize: 12, italic: true, color: C.muted, margin: 0 });
    footer(s);
    s.addNotes("~20 s (4:10–4:30). SDG 3 is about well-being at all ages — the residents of a home for the aged are the people it names. Give one line per row; the measured SOS delivery time is the concrete link.");
  }

  // 10. What we let go
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "What we let go", "Removed or deferred — each with a reason");
    tableSlide(s, ["Feature", "Why", "Status"], [
      ["GPS + outdoor geofencing, GSM (SIM800L)", "Unreliable indoors; 2G sunset in the Philippines", "Removed (adviser)"],
      ["Fall detection (accelerometer)", "Priority on localization and SOS", "Removed (adviser)"],
      ["Native mobile app", "A browser page works on every phone", "Not developed"],
      ["Low-dropout regulator", "No part sourced in time", "Boost converter used"],
      ["MAX17043 fuel gauge", "Not delivered in time", "Divider used; firmware ready"],
      ["Measured 24 h runtime", "No full discharge test possible", "Calculated only (≈ 20 h, 2000 mAh)"],
      ["Remote viewing, push notifications", "Needs cloud hosting (open decision)", "Built and tested locally; further study"],
    ], [4.2, 4.4, 3.5], 1.8, 14, 0.6);
    footer(s);
    s.addNotes("~25 s (4:30–4:55). State these plainly — the adviser asked for them. Two were adviser decisions, two were part availability, one is time, one is an open hosting decision. The remote relay exists and passed 15 of 15 local tests, but putting health data on a cloud service is a decision for the adviser and the facility.");
  }

  // 11. Results
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Results", "Measured 24 Sep – 1 Oct 2026 · paper Chapter 4");
    const cards = [
      [I.radio, "Zone accuracy (Run\u00A01)", "0 cross-room errors · 56.2\u00A0% where two zones shared a room"],
      [I.timer, "SOS delivery to the hub", "median 295\u00A0ms · max 408\u00A0ms (n\u00A0=\u00A06)"],
      [I.heart, "Heart rate vs oximeter", "+3 and +0.5\u00A0bpm (2 readings, preliminary)"],
      [I.door, "Door openings", "4 of 4 detected (29 Sep: 3 · demo 30 Sep: 1)"],
      [I.wifi, "Network loss", "4 of 4 events delivered after reconnecting (7.5–11.1\u00A0s)"],
      [I.check, "Dashboard and hub", "38 / 38 checks · hub 17 / 17 · 4 phones: median 32\u00A0ms"],
    ];
    cards.forEach(([img, h, b], i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.6 + col * 4.1, y = 1.95 + row * 2.45;
      card(s, x, y, 3.8, 2.15);
      circleIcon(s, img, x + 0.3, y + 0.3, 0.7, i < 4 ? C.teal : C.safe);
      txt(s, h, { x: x + 1.15, y: y + 0.3, w: 2.5, h: 0.7, fontSize: 16, bold: true, color: C.ink, margin: 0, valign: "middle" });
      txt(s, b, { x: x + 0.3, y: y + 1.2, w: 3.25, h: 0.8, fontSize: 14, bold: true, color: i < 4 ? C.teal : C.safe, margin: 0, valign: "middle" });
    });
    footer(s);
    s.addNotes("~30 s (4:55–5:25). Lead with zero cross-room errors, then the SOS delivery time. Be candid: the 56.2 % is from Run 1 on earlier firmware where two zones shared one room (the Run 3 capture on the final firmware was overwritten); the heart-rate figure is two readings only; network loss is four occurrences during other tests, not the planned outage trials. Then go straight to the demo.");
  }

  // 12. Demo
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    s.addText("Live demonstration", { x: 0.6, y: 0.45, w: 12, h: 0.8, fontFace: HF, fontSize: 34, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("Scan the card — join SESEMSG — the dashboard opens on your phone (passcode on the card)", { x: 0.6, y: 1.2, w: 12, h: 0.45, fontFace: BF, fontSize: 16, italic: true, color: "9FC7CC", margin: 0, isTextBox: true });
    const steps = [["Join by QR", "Dashboard pops up", C.teal], ["Walk the zones", "Bedroom → Dining", C.safe], ["Open the door", "Door alert", C.alert], ["Medicine Room", "Restricted alert + buzzer", C.alert], ["SOS 1 → 3 presses", "Alarm on phones, escalates", C.alert], ["Hold 3 s", "Cancels; phones show green", C.amber], ["Acknowledge", "Wearable clears", C.teal]];
    steps.forEach(([h, b, col], i) => {
      const x = 0.6 + i * 1.76;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.4, w: 1.6, h: 2.6, fill: { color: "123F4C" }, line: { color: col, width: 2 }, rectRadius: 0.1 });
      s.addShape(pres.shapes.OVAL, { x: x + 0.5, y: 2.6, w: 0.6, h: 0.6, fill: { color: col }, line: { color: col } });
      s.addText(String(i + 1), { x: x + 0.5, y: 2.6, w: 0.6, h: 0.6, fontFace: BF, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText([{ text: h, options: { bold: true, fontSize: 14, breakLine: true } }, { text: b, options: { fontSize: 12, color: "CFE8EA" } }], { x: x + 0.03, y: 3.35, w: 1.54, h: 1.5, fontFace: BF, color: C.white, align: "center", valign: "top", margin: 0, isTextBox: true });
    });
    s.addText("Safe zones at opposite ends of this room; the restricted zone is behind the door (paper 4.5).\nFallback: laptop server on the facility Wi-Fi (the wearable switches by itself) · backup video of the full demo.", { x: 0.6, y: 5.6, w: 12, h: 0.8, fontFace: BF, fontSize: 14, color: "9FC7CC", margin: 0, isTextBox: true });
    footer(s);
    s.addNotes("~3½ min (5:25–8:55) — the heart of the presentation; the adviser asked for the demo to be emphasized. Hand out the access cards first. State that zones in this single room stand in for separate rooms. Run order as in the checklist: door open → restricted zone → SOS → hold 3 s to cancel → acknowledge. If the hub misbehaves, switch to the laptop fallback or play the backup video, and say which one it is.");
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
      { text: "Restricted-zone, door and 3-level SOS alerts end to end", options: { bullet: true, breakLine: true } },
      { text: "Runs with no laptop or internet: the door node is the hub", options: { bullet: true, breakLine: true } },
      { text: "Dashboard on any phone: 38/38 checks; hub 17/17", options: { bullet: true, breakLine: true } },
      { text: "Network-down queueing with an audible local fallback", options: { bullet: true } },
    ], { x: 0.9, y: 2.65, w: 5.5, h: 3.9, fontSize: 15, paraSpaceAfter: 10, margin: 0 });
    card(s, 6.9, 1.55, 5.8, 5.2, C.alertTint);
    circleIcon(s, I.lightbulb, 7.2, 1.8, 0.65, C.alert);
    txt(s, "Limits and next steps", { x: 8.0, y: 1.85, w: 4.5, h: 0.55, fontSize: 22, bold: true, color: C.ink, margin: 0, valign: "middle" });
    txt(s, [
      { text: "Fix the power path (≥ 1 A switch, short thick wiring), then measure the runtime", options: { bullet: true, breakLine: true } },
      { text: "Buck-boost or sub-400 mV regulator: ≈ 54 h calculated at 35 mA (2000 mAh)", options: { bullet: true, breakLine: true } },
      { text: "Repeat the 15-point zone run on the final firmware", options: { bullet: true, breakLine: true } },
      { text: "Doorway coverage: tune the floor or add beacons", options: { bullet: true, breakLine: true } },
      { text: "Heart rate: more readings, more people, clinical reference", options: { bullet: true, breakLine: true } },
      { text: "Cloud relay and push notifications once hosting is decided; charging indicator; fuel gauge", options: { bullet: true } },
    ], { x: 7.2, y: 2.65, w: 5.3, h: 3.9, fontSize: 14, paraSpaceAfter: 7, margin: 0 });
    footer(s);
    s.addNotes("~25 s (8:55–9:20). Matches paper Chapter 5. Be direct about the runtime gap: it follows from a sourcing constraint, the fix is known, and it is a recommendation. Battery reporting is not claimed as achieved: it could not be verified on the cell (paper 4.12).");
  }

  // 14. Q&A
  {
    const s = pres.addSlide(); s.background = { color: C.ink };
    circleIcon(s, I.pin_t, W / 2 - 0.6, 1.6, 1.2, C.white);
    s.addText("Thank you", { x: 0.6, y: 3.1, w: W - 1.2, h: 1.0, fontFace: HF, fontSize: 48, bold: true, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addText("Questions and answers", { x: 0.6, y: 4.1, w: W - 1.2, h: 0.6, fontFace: BF, fontSize: 22, color: "9FC7CC", align: "center", margin: 0, isTextBox: true });
    s.addText("Chester John B. Cirio  ·  Pathrish Anne R. Cruz  ·  Adviser: Engr. Glenn V. Magwili", { x: 0.6, y: 5.6, w: W - 1.2, h: 0.5, fontFace: BF, fontSize: 14, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addNotes("Likely questions: why not UWB or Wi-Fi RSSI; why the runtime falls short; what happens when Wi-Fi or the hub fails (queue + chirp; laptop fallback); how many phones the hub supports (7 + the wearable); how accurate the heart rate is; why only the wearable is an etched board and the nodes are perfboard (adviser-approved); why there is no fuel gauge (the MAX17043 was not delivered); where the data is stored (on site; RA 10173); why there is no Run 3 result (the capture was overwritten; the logger no longer overwrites); does the wearable run on its battery (power-path fault, paper 4.12); why n below 2.0 — the paper calls 2.0 the free-space value and physical lower bound; if challenged, say values somewhat below 2 do occur indoors along corridors, but 0.28 and 0.55 are far below any such value, which is why the residual pattern points to fading at fixed positions.");
    slideNo++;
  }

  // Backup A. Test 1
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Backup — Test 1, signal strength vs. distance", "Single beacon, +9 dBm, line of sight, ≥ 60 samples per mark (21 Sep 2026)");
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
    txt(s, [{ text: "n = 0.28 / 0.55", options: { fontSize: 40, bold: true, color: C.alert, breakLine: true } }, { text: "free-space reference = 2.0", options: { fontSize: 14, color: C.muted } }], { x: 7.9, y: 2.35, w: 4.8, h: 1.3, margin: 0 });
    txt(s, [
      { text: "The same ±3 dB pattern appeared with two different beacons → a property of the position, not the radio", options: { bullet: true, breakLine: true } },
      { text: "Standing-wave fading: at 12.5 cm wavelength, maxima and minima every ~6\u00A0cm", options: { bullet: true, breakLine: true } },
      { text: "Conclusion: distance from RSSI is unreliable indoors — so the design never uses it", options: { bullet: true, bold: true } },
    ], { x: 7.9, y: 3.9, w: 4.8, h: 2.8, fontSize: 14, paraSpaceAfter: 8, margin: 0 });
    footer(s);
    s.addNotes("Backup. Run A is the bedroom_wing beacon; run B (dining_hall, data/test1/test1_los.csv) gives 0.55 on the mark means. Do not call 2.0 a physical minimum: indoor line-of-sight exponents below 2 are commonly reported. A documented negative result: the signal does not fall off smoothly with distance indoors; two independent beacons showed the same residual pattern, which identifies the environment (multipath) as the cause. It justifies classification by comparison rather than distance.");
  }

  // Backup B. Test 2 Run 1
  {
    const s = pres.addSlide(); s.background = { color: C.white };
    title(s, "Backup — Test 2, Run 1 (earlier firmware)", "School, 24 Sep 2026 · 495 samples · 16 points · bedroom and medicine beacons shared one room");
    const stats = [["0", "cross-room errors", "never reported the wrong room across a wall", C.safe], ["83–100\u00A0%", "within 1 m of a beacon", "Medicine and Dining 100 %; Bedroom 83 % and 93 %", C.teal], ["23.2 %", "unresolved", "all at doorways, below the −88 dBm floor", C.amber]];
    stats.forEach(([big, lab, sub, col], i) => {
      const y = 1.9 + i * 1.62;
      card(s, 0.6, y, 5.3, 1.45);
      txt(s, big, { x: 0.8, y: y + 0.15, w: 2.2, h: 1.1, fontSize: big.length > 6 ? 26 : 40, bold: true, color: col, valign: "middle", margin: 0 });
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

  // Backup C. Engineering findings
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
