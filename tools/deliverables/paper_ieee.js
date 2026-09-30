// TroDes — full paper in IEEE format (two columns), Revision 6, 1 Oct 2026.
// Usage: node paper_ieee.js <out.docx>
// IEEE conventions applied: two-column body in 10-pt Times New Roman, 24-pt title,
// centred byline, 150–250-word abstract and Index Terms, tables numbered TABLE I, II …
// with the caption above, figures numbered Fig. 1, 2 … with the caption below,
// equations numbered (1), (2) … at the right margin, references numbered in order
// of first citation. The drop cap on the first paragraph is applied by Word when
// the file is exported (see README). Wide tables and figures use full-width blocks.
// Yellow text marks a value still to be measured or decided — never an estimate.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, Footer, PageNumber, ImageRun, SectionType, TabStopType, TableLayoutType, VerticalAlign,
} = require("docx");

const OUT = process.argv[2];
const FIGDIR = path.join(__dirname, "figures");
const FONT = "Times New Roman";
const COL = 5040;            // column width, twips (3.5 in)
const FULL = 10440;          // full text width, twips (7.25 in)

// ---------------------------------------------------------------- numbering
// Keys in order of appearance: IEEE numbers tables, figures and equations in the
// order they occur. T("key") -> "Table IV", F("key") -> "Fig. 3", E("key") -> "(2)".
const TABLES = ["instr", "ipo", "runtime", "matrix", "constraints", "descoped",
  "t1", "fit", "match", "r1cm", "r1zone", "r1pts", "walk", "r3snap", "sos", "hr", "door", "wifi",
  "hub", "selftest", "power", "notdone", "bom"];
const FIGS = ["arch", "pcb3d", "encl", "t1", "r1", "walk", "dash", "power",
  "sch", "copper", "doorwire", "beacon", "nodes", "fc_main", "fc_zone", "fc_sos", "fc_hub", "qr"];
const EQS = ["pathloss", "ema", "acc", "prec", "rec", "f1", "mean", "sd", "se", "mae", "bias", "det",
  "icell", "runtime", "div", "ib", "led", "tr", "bpm"];
const roman = (n) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV",
  "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI"][n];
const idx = (list, k) => { const i = list.indexOf(k); if (i < 0) throw new Error("unknown label " + k); return i + 1; };
const T = (k) => `Table ${roman(idx(TABLES, k))}`;
const F = (k) => `Fig. ${idx(FIGS, k)}`;
const E = (k) => `(${idx(EQS, k)})`;
const usedT = [], usedF = [], usedE = [];

// ---------------------------------------------------------------- text helpers
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: 20, ...o });
const tbd = (text, o = {}) => new TextRun({ text: `[${text}]`, font: FONT, size: 20, highlight: "yellow", bold: true, ...o });
function runs(parts, base = {}) {
  const list = Array.isArray(parts) ? parts : [parts];
  const out = [];
  for (const p of list) {
    if (typeof p !== "string") { out.push(p); continue; }
    const re = /(_\{[^}]+\}|\^\{[^}]+\}|\*\*[^*]+\*\*|(?<![A-Za-z0-9])_[^_{]+_(?![A-Za-z0-9])|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(p))) {
      if (m.index > last) out.push(t(p.slice(last, m.index), base));
      const s = m[0];
      if (s.startsWith("_{")) out.push(t(s.slice(2, -1), { ...base, subScript: true }));
      else if (s.startsWith("^{")) out.push(t(s.slice(2, -1), { ...base, superScript: true }));
      else if (s.startsWith("**")) out.push(t(s.slice(2, -2), { ...base, bold: true }));
      else if (s.startsWith("_")) out.push(t(s.slice(1, -1), { ...base, italics: true }));
      else out.push(new TextRun({ text: s.slice(1, -1), font: "Courier New", size: (base.size || 20) - 2 }));
      last = m.index + s.length;
    }
    if (last < p.length) out.push(t(p.slice(last), base));
  }
  return out;
}
const P = (parts, o = {}) => new Paragraph({ children: runs(parts), alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 202 }, spacing: { after: 0, line: 240 }, ...o });
const PN = (parts, o = {}) => P(parts, { indent: { firstLine: 0 }, ...o });   // no first-line indent
const H1 = (text) => new Paragraph({ children: [t(text, { smallCaps: true })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 }, keepNext: true, keepLines: true });
const H2 = (text) => new Paragraph({ children: [t(text, { italics: true })], spacing: { before: 120, after: 60 }, keepNext: true, keepLines: true });
const H3 = (text) => new Paragraph({ children: [t(text, { italics: true })], indent: { firstLine: 202 }, spacing: { before: 60, after: 0 }, keepNext: true });
const B = (parts) => new Paragraph({ children: [t("• "), ...runs(parts)], alignment: AlignmentType.JUSTIFIED, indent: { left: 360, hanging: 200 }, spacing: { after: 0 } });
const N = (n, parts) => new Paragraph({ children: [t(`${n}) `), ...runs(parts)], alignment: AlignmentType.JUSTIFIED, indent: { left: 360, hanging: 260 }, spacing: { after: 0 } });
const TODO = (text) => new Paragraph({ children: [tbd(text)], spacing: { before: 60, after: 60 } });
const SP = (after = 80) => new Paragraph({ children: [], spacing: { after } });
function EQ(key, text) {
  usedE.push(key);
  return new Paragraph({
    tabStops: [{ type: TabStopType.CENTER, position: COL / 2 }, { type: TabStopType.RIGHT, position: COL }],
    spacing: { before: 60, after: 60 },
    children: [t("\t"), ...runs(text, { italics: true }), t("\t" + E(key))],
  });
}
const CODE = (line) => new Paragraph({ children: [new TextRun({ text: line || " ", font: "Courier New", size: 14 })], spacing: { after: 0, line: 200 } });

// ---------------------------------------------------------------- figures and tables
function fig(key, file, widthTw, caption) {
  usedF.push(key);
  const buf = fs.readFileSync(path.join(FIGDIR, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const wPx = Math.round(widthTw / 1440 * 96), hPx = Math.round(wPx * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, keepNext: true, children: [new ImageRun({ type: "png", data: buf, transformation: { width: wPx, height: hPx } })] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 60, after: 140 }, children: [t(`${F(key)}.  `, { size: 16 }), ...runs(caption, { size: 16 })] }),
  ];
}
const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function table(key, title, header, rows, rel, width = COL, fontSize = 16) {
  usedT.push(key);
  const sum = rel.reduce((a, b) => a + b, 0);
  const widths = rel.map((r) => Math.floor(width * r / sum));
  const cell = (content, w, isHead, keep) => new TableCell({
    width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    borders: { top: isHead ? border : none, bottom: isHead ? border : none, left: none, right: none },
    margins: { top: 20, bottom: 20, left: 60, right: 60 },
    children: [new Paragraph({ spacing: { after: 0 }, keepNext: keep, children: isHead ? [t(content, { size: fontSize, bold: true })] : runs(content, { size: fontSize }) })],
  });
  const keepAll = rows.length <= 16;   // longer tables may break, with the header repeated
  const body = rows.map((r, i) => new TableRow({ cantSplit: true, children: r.map((c, j) => cell(c, widths[j], false, keepAll && i < rows.length - 1)) }));
  const tbl = new Table({
    width: { size: width, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    borders: { top: border, bottom: border, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true, true)) }), ...body],
  });
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 140, after: 0 }, keepNext: true, children: [t(`TABLE ${roman(idx(TABLES, key))}`, { size: 16 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, keepNext: true, children: [t(title, { size: 16, smallCaps: true })] }),
    tbl,
    SP(120),
  ];
}
const Y = (text) => tbd(text, { size: 16 });   // a yellow table cell

// Content is a list of blocks. WIDE([...]) marks a full-width block (a one-column
// section between two-column sections).
const WIDE = (children) => ({ wide: children });

// =============================================================================
// FRONT MATTER
// =============================================================================
const title = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [t("TroDes: An Indoor Bluetooth Low Energy-Based Localization and Safety Monitoring System for a Home for the Aged", { size: 48 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [t("Chester John B. Cirio and Pathrish Anne R. Cruz", { size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [t("School of Electrical, Electronics and Computer Engineering, Mapúa University, Manila, Philippines", { size: 20, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [t("Electronics Design, Section C1 · Adviser: Engr. Glenn V. Magwili", { size: 20, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [tbd("author e-mail addresses", { size: 18 })] }),
];

const abstract = [
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 }, children: [
    t("Abstract", { bold: true, italics: true, size: 18 }), t("—", { bold: true, size: 18 }),
    t("Residents of homes for the aged, especially those with cognitive decline, may wander into unsafe areas or need help when no caregiver is nearby, and satellite trackers do not work reliably indoors. This paper presents TroDes, an indoor safety monitoring system built around Bluetooth Low Energy. A wearable device identifies the resident's zone by selecting the strongest of the beacons installed one per zone, using smoothing, a detection floor, hysteresis and a confirmation time that adapts to the signal margin. It also reports heart rate, battery level and emergency calls at three urgency levels chosen by the number of button presses, while a magnetic sensor monitors a restricted door. Caregivers follow a live dashboard on their phones, served by the door sensor node over its own wireless network, so the system operates with or without an internet connection. The study followed a developmental research design with experimental evaluation. A signal-strength-versus-distance test gave path-loss exponents of 0.28 and 0.55, far below the free-space value of 2.0, showing that indoor distance estimation is unreliable and justifying classification by comparison between beacons. An initial run produced no errors between zones separated by a wall. ", { bold: true, size: 18 }),
    t(" Accuracy fell to 56.2 percent where two zones shared one room, six SOS alerts reached the hub in a median of 295 ms, and all four recorded door openings were detected.", { bold: true, size: 18 }),
    t(" The results show that room-level monitoring is achievable with low-cost components and without subscription services.", { bold: true, size: 18 }),
  ] }),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: [
    t("Index Terms", { bold: true, italics: true, size: 18 }),
    t("—Bluetooth Low Energy, elderly care, indoor localization, received signal strength, wearable sensors.", { bold: true, size: 18 }),
  ] }),
];

// =============================================================================
// CHAPTER 1
// =============================================================================
const ch1 = [
  H1("Chapter 1: Background and Introduction"),
  H2("1.1 Overview"),
  P("The Philippine population is ageing. In the 2020 Census of Population and Housing, persons aged 65 years and over accounted for 5.4 percent of the household population, or approximately 5.86 million persons [1]. As the number of older Filipinos grows, so does reliance on residential care facilities such as homes for the aged, where a small number of caregivers must monitor many residents simultaneously. Two safety concerns dominate: residents wandering into areas that are unsafe or restricted, and residents needing urgent assistance with no staff nearby to notice. This design project proposes an indoor localization and safety monitoring system, built around Bluetooth Low Energy (BLE), that identifies a resident's zone within the facility, monitors entry into restricted areas through door sensors, and delivers real-time alerts to caregivers through a web-based dashboard."),
  H2("1.2 Target Customer"),
  P("The primary beneficiaries are elderly residents of a home for the aged, particularly those with cognitive decline or a tendency to wander. The direct users are the facility's caregivers and staff, who need to monitor the location and status of residents continuously without checking each room in person, and to be notified immediately when a resident needs help or enters a restricted area."),
  H2("1.3 Statement of the Problem"),
  P("Care facilities for the elderly face a persistent monitoring gap:"),
  B("Caregiver-to-resident ratios make continuous direct supervision of every resident impractical, especially during night shifts."),
  B("Wandering is a recognized behavioural problem in people with dementia and can lead residents into unsafe areas or out of the facility unnoticed [2]."),
  B("A resident who needs urgent help often has no reliable way to summon a caregiver from wherever he or she happens to be."),
  B("Existing commercial monitoring products are largely designed for outdoor satellite tracking of individuals and typically require recurring subscriptions, which matches an indoor institutional setting poorly."),
  H2("1.4 Proposed Solution"),
  P("The proposed system has three parts. First, a wearable device built around an ESP32 microcontroller continuously scans for BLE beacons installed throughout the facility and decides the resident's zone by comparing their received signal strengths; it also carries a heart rate sensor, a battery measurement, a buzzer, a status LED and an SOS button through which the resident can call for help at three levels of urgency. Second, fixed infrastructure: one BLE beacon per zone and a magnetic reed sensor on the door of each restricted area. Third, a web-based caregiver dashboard that shows each resident's zone, classified as safe or restricted, with battery level and heart rate, and raises real-time alerts. The dashboard is served either by a computer on the facility network or by the door sensor node itself, which then operates as a stand-alone hub with its own Wi-Fi network; the system therefore works with or without an internet connection."),
  H2("1.5 Objectives"),
  P("**General objective.** To design and develop an indoor elderly localization and safety monitoring system for a home for the aged that integrates BLE-based zone tracking, restricted-area door monitoring, resident-initiated emergency alerting and a web-based caregiver dashboard."),
  PN("**Specific objectives.**"),
  N(1, "To design a wearable device that determines the resident's current zone through BLE signal strength from fixed beacons."),
  N(2, "To implement door sensors at restricted-area entry points that generate immediate alerts when a door is opened."),
  N(3, "To implement an SOS button with distinct alert and dismiss behaviour."),
  N(4, "To monitor and report the wearable's battery level and the resident's heart rate to the caregiver dashboard."),
  N(5, "To develop a web-based caregiver interface displaying resident location, device status and active alerts in real time."),
  N(6, "To define and validate a fallback alerting behaviour for periods when network connectivity is unavailable."),
  N(7, "To evaluate the system's zone detection accuracy, alert response time and battery endurance against the approved 24-hour runtime target."),
  H2("1.6 Scope and Limitations"),
  P("The system is designed for a single indoor care facility; outdoor tracking is outside the scope. Localization is zone-based: it identifies the room or area the resident occupies and flags restricted areas. The demonstration uses three zones — the bedroom wing and dining hall (safe) and the medicine room (restricted) — and one wearable; the architecture scales to more residents. The caregiver interface is a web application for any browser, including phone browsers."),
  P("BLE localization is affected by wall materials, multipath propagation and beacon placement, so the system provides zone-level rather than coordinate positioning. Fall detection is not included. Heart rate readings from a wearable optical sensor are indicative, not clinical. The dashboard is reachable on the facility network or the hub's own network; viewing from outside the facility was designed but not deployed, and alerts reach caregivers whose dashboard page is open. The stand-alone hub keeps its alert history in memory, whereas the computer backend keeps a persistent history."),
  H2("1.7 Comparison to Existing Products"),
  P("Commercial elderly monitoring devices such as GPS tracking watches and pendants provide location tracking, geofencing and emergency buttons, but they rely on outdoor satellite positioning and cellular connectivity and generally require recurring subscription fees. Satellite positioning performs poorly indoors [3], and per-device subscriptions scale badly when a facility must equip many residents. The proposed system uses BLE for indoor zone localization, operates on the facility's own equipment without subscriptions, and adds fixed door sensors at restricted areas."),
  H2("1.8 Significance of the Study"),
  P("For residents, the system provides a means to summon help from anywhere in the facility and a safeguard against entering unsafe areas unnoticed. For caregivers, it reduces the burden of continuous physical monitoring and shortens the time between an incident and a response. For the facility, it offers a locally deployable, subscription-free capability built from commonly available components. The project contributes to Sustainable Development Goal 3, Good Health and Well-Being [4]."),
];

// =============================================================================
// CHAPTER 2
// =============================================================================
const ch2 = [
  H1("Chapter 2: Review of Related Literature"),
  H2("2.1 Indoor Localization Technologies"),
  P("Zafari, Gkelias and Leung [3] survey indoor localization systems and technologies, including Wi-Fi, Bluetooth, Zigbee, radio-frequency identification, ultra-wideband (UWB), visible light, acoustic and ultrasound systems, and the techniques used with them: angle of arrival, time of flight and received signal strength (RSS). Satellite positioning is designed for outdoor use; inside buildings the signals are attenuated and reflected, which motivates dedicated indoor technologies. RSS-based methods need no specialised receiver hardware and run on commodity radios, at the cost of accuracy that depends strongly on the environment [3]."),
  P("BLE suits institutional deployment because its beacons are inexpensive, low-power and simple to install, and because BLE radios are built into common microcontrollers such as the ESP32 [5]. Beacons following the iBeacon format broadcast a proximity identifier with major and minor fields [6], so a receiver can identify the zone a beacon represents without establishing a connection."),
  H2("2.2 Radio Propagation and Received Signal Strength"),
  P(`The log-distance path-loss model ${E("pathloss")} expresses the received power at distance _d_ as a reference power at 1 m less 10·_n_·log₁₀(_d_), where _n_ is the path-loss exponent: _n_ = 2 in free space and typically larger indoors [7]. The model describes the average trend; at any point, multipath interference adds large position-dependent deviations. Faragher and Harle [8] showed with 19 beacons over approximately 600 m² that BLE is highly susceptible to fast fading and that achievable accuracy depends on how fading is mitigated, for example by combining advertising channels and filtering over time.`),
  H2("2.3 BLE Localization in Elderly and Care Settings"),
  P("Kolakowski _et al._ [9] developed a hybrid UWB and BLE tracking system for monitoring elderly people; in static tests the median localization error was approximately 23 cm with UWB and approximately 1 m with BLE. Garcia and Inoue [10] deployed 25 stationary BLE beacons on one floor of a nursing care facility to track caregivers and used machine learning with a relabeling technique to improve the classification of rarely visited locations. Both confirm that BLE is practical in care settings, and both obtain their accuracy from dense infrastructure or trained models."),
  H2("2.4 Wandering in Dementia"),
  P("Cipriani _et al._ [2] review wandering as a behavioural problem of people with dementia, including its consequences such as injury and elopement, and the approaches used to manage it. The review supports alerting caregivers when a resident enters a restricted area rather than attempting to prevent movement."),
  H2("2.5 Synthesis and Research Gap"),
  P("The reviewed BLE systems pursue fine-grained accuracy through dense beacon deployments [10], hybrid UWB hardware [9] or fingerprinting [8]. A home for the aged, however, needs to know which room a resident is in and whether that room is restricted, at low cost and with components that can be maintained locally. This project addresses room-level classification with one beacon per zone, using relative signal strength with smoothing and hysteresis instead of distance estimation, combined with door sensors, a resident-operated SOS button and a subscription-free dashboard that works without an internet connection."),
];

// =============================================================================
// CHAPTER 3 — METHODOLOGY AND DESIGN PROCEDURES
// =============================================================================
const ch3 = [
  H1("Chapter 3: Methodology and Design Procedures"),
  H2("3.1 Research Design"),
  P("The study used a **developmental research design** with **experimental evaluation**. The developmental part covers the iterative design, construction and refinement of the wearable, the beacons, the door sensor node and the dashboard (Sections 3.5 to 3.12). The experimental part measures the performance of the completed prototype under controlled conditions: independent variables such as distance to a beacon, the wearer's position and the button pattern are set by the tester, and the dependent variables — received signal strength, reported zone, delivery time, detected door events and heart rate — are recorded by instruments and compared with ground truth or a reference device."),
  H2("3.2 Materials and Instruments"),
  ...table("instr", "Instruments used in the tests", ["Instrument", "Use"], [
    ["Digital multimeter (DC volts, continuity, 10 A range)", "Power-path voltages, joint continuity, boost converter setting"],
    ["Fingertip pulse oximeter", "Reference heart rate for the MAX30102 comparison"],
    ["Laptop with a USB serial logger", "Timestamped capture of the wearable's and door node's serial output, with the tester's ground-truth label on every line"],
    ["Python analysis scripts (zone accuracy, distance profile, test-day report)", "Confusion matrices, fitted path-loss model, delivery time, heart-rate error, door detection"],
    ["Tape measure", "Distances from the wearable to each beacon"],
    ["Phones (Android and iOS)", "Dashboard verification over the hub's network"],
  ], [3, 4]),
  H2("3.3 Data-Gathering Procedure"),
  P("Every test records the device's own serial output on the laptop while the tester types the ground truth — the true distance, the true zone, the oximeter reading or the door cycle number — as a label that is attached to every captured line. Each test fixes its constants beforehand (firmware version, beacon power, heights), follows a written procedure, and stores the raw capture unmodified; analysis is done afterwards by script, so that no result depends on manual transcription. The first 5 s after each label change are discarded in zone tests, because the wearable needs time to settle after the tester stops."),
  H2("3.4 Statistical Treatment of Data"),
  P(`Signal strength is modelled with the log-distance path-loss equation ${E("pathloss")} and smoothed on the wearable with an exponential moving average ${E("ema")}:`),
  EQ("pathloss", "RSSI(d) = A − 10 n log_{10}(d)"),
  EQ("ema", "S_{k} = α x_{k} + (1 − α) S_{k−1}"),
  P(`where _A_ is the received power at 1 m and _n_ the path-loss exponent, both fitted by least squares, _S_ is the smoothed signal strength, _x_ the new sample and α the smoothing factor. Zone classification is evaluated with a confusion matrix whose rows are the true zones and whose columns are the reported zones. Overall accuracy ${E("acc")}, and precision ${E("prec")}, recall ${E("rec")} and F1 score ${E("f1")} per zone are computed from the counts of true positives (TP), false positives (FP) and false negatives (FN):`),
  EQ("acc", "Accuracy = (correct samples / total samples) × 100%"),
  EQ("prec", "P = TP / (TP + FP)"),
  EQ("rec", "R = TP / (TP + FN)"),
  EQ("f1", "F1 = 2PR / (P + R)"),
  P(`Measured quantities are summarised by their mean ${E("mean")}, sample standard deviation ${E("sd")} and standard error of the mean ${E("se")}:`),
  EQ("mean", "x̄ = (1/n) Σ xᵢ"),
  EQ("sd", "s = √[ Σ (xᵢ − x̄)² / (n − 1) ]"),
  EQ("se", "SE = s / √n"),
  P(`The heart rate _w_ᵢ reported by the wearable is compared with the oximeter reading _r_ᵢ by the mean absolute error ${E("mae")} and the bias ${E("bias")}; door reliability is expressed as the detection rate ${E("det")}:`),
  EQ("mae", "MAE = (1/n) Σ | wᵢ − rᵢ |"),
  EQ("bias", "Bias = (1/n) Σ (wᵢ − rᵢ)"),
  EQ("det", "Detection rate = (detected openings / cycles) × 100%"),
  H2("3.5 Conceptual Framework"),
  ...table("ipo", "Input–process–output framework", ["Input", "Process", "Output"], [
    ["BLE advertisements", "Filter by project UUID and major; smooth RSSI with α = 0.4; drop beacons older than 2.5 s or below −88 dBm; select the strongest with 5 dB hysteresis and an adaptive confirmation (0.4 s at a lead ≥ 10 dB, else 1.6 s), every 200 ms; zone unknown only after a further 6 s with no beacon", "Zone; zone-change, restricted-zone and location-unknown alerts"],
    ["SOS button", "40 ms debounce; count presses less than 0.7 s apart (1–3); 3 s hold, ticked each second, dismisses", "SOS at three urgency levels, escalation, dismissal"],
    ["Battery voltage (GPIO 34)", "16-sample average; Li-Po table; below 2.5 V means no cell", "Battery %; alerts at 20 % and 10 %"],
    ["Optical pulse (MAX30102)", "100 samples/s; finger detection; interval limits and median filter", "Heart rate or no reading"],
    ["Reed switch", "Pull-up; 50 ms debounce; 30 s heartbeat", "Door events; node offline detection"],
    ["Device reports (Wi-Fi)", "Event time from device uptime; repeated reports merged; stale detection", "Dashboard; alerts until acknowledged"],
  ], [2, 4, 2.4]),
  H2("3.6 Block Diagram"),
  P(`${F("arch")} shows the two deployment modes. Beacons only broadcast; the wearable decides the zone itself, so localization never depends on the network. In the stand-alone mode (a), which is demonstrated, the door sensor node also acts as the hub: it creates a WPA2-protected Wi-Fi network, receives the wearable's reports, applies the alert rules and serves the dashboard to phones that join. In the facility-network mode (b), the devices report over the building's Wi-Fi to a computer running the same dashboard with a persistent database. The wearable selects the hub when its network is present and otherwise falls back to the facility network; with no network at all it queues events and sounds a periodic local chirp.`),
  WIDE([...fig("arch", "f1_arch_v2.png", FULL, "System block diagram: (a) stand-alone hub, as demonstrated — no computer, router or internet connection; (b) facility-network alternative. Remote viewing (dashed) is further study.")]),
  H2("3.7 Schematic Diagram and Printed Circuit Board"),
  P(`The wearable schematic (Appendix B) comprises the ESP32 development board (U1), the MAX30102 heart rate module (U2), the optional MAX17043 fuel gauge (U3), the TP4056 charger with DW01 protection, the MT3608 boost converter, the power switch (SW1), the SOS button (SW2), the buzzer driver (Q1, R1, D1, BZ1), the status LED (D2, R2), the battery divider (R3, R4, C4), the I²C pull-ups (R5, R6) and bulk and decoupling capacitors (C1–C3). The single-sided Revision C3 board (${F("pcb3d")}; copper layout in Appendix C) passed the KiCad design-rule check and schematic-parity check with no errors, no unconnected pads and no differences; all power traces are 0.8 mm wide over a ground pour.`),
  ...fig("pcb3d", "a_pcb_3d.png", COL, "Wearable printed circuit board, Revision C3 (KiCad 3-D view, component side). The battery, charger, boost converter and switch are wired off-board to J1, J2 and SW1."),
  H2("3.8 Applicable Standards and Regulations"),
  B("IEC 62133-2 — safety of portable lithium cells and batteries [11], for the wearable's Li-Po cell."),
  B("IEC 62368-1 — safety of information and communication technology equipment."),
  B("Bluetooth Core Specification [12] (formerly IEEE 802.15.1) — the BLE advertising used for localization."),
  B("IEEE 802.11 — the Wi-Fi link; the hub's network uses WPA2 personal security."),
  B("Republic Act No. 10173, the Data Privacy Act of 2012 [13] — location and heart rate are personal and health information; access is limited by a passcode, data stays on the facility's equipment by default, and acknowledgements are logged."),
  H2("3.9 Component Computations"),
  H3("3.9.1 Power chain and runtime."),
  P(`No low-dropout regulator could be sourced in time, so the wearable uses a boost topology: cell → TP4056/DW01 → switch → MT3608 boost to 5.0 V → development-board regulator → 3.3 V. The cell current ${E("icell")} and the runtime ${E("runtime")} are`),
  EQ("icell", "I_{cell} = (V_{out} · I_{out}) / (η · V_{cell})"),
  EQ("runtime", "t = C / I_{cell}"),
  P(`With V_{out} = 5.0 V, η ≈ 0.88 and V_{cell} = 3.7 V, a 60 mA load plus about 5 mA regulator current gives I_{cell} ≈ 100 mA and t ≈ 20 h for the 2000 mAh cell fitted to the prototype (the schematic lists the 1000 mAh cell first specified, which would give 10 h); reducing the load to 35 mA gives about 61 mA and 33 h (${T("runtime")}). These are calculated values, not measurements: the 24-hour target is met by calculation only after the duty-cycle reduction.`),
  ...table("runtime", "Calculated runtime of the 2000 mAh cell", ["3.3 V load", "Cell current", "Runtime"], [
    ["60 mA (continuous scanning, 5 s reports)", "≈ 100 mA", "≈ 20 h"],
    ["35 mA (after duty-cycle reduction)", "≈ 61 mA", "≈ 33 h"],
  ], [3, 1.4, 1]),
  H3("3.9.2 Battery sense divider."),
  P(`With R3 = R4 = 100 kΩ, the divider ${E("div")} presents 2.1 V to GPIO 34 for a full 4.2 V cell, inside the ADC range at 11 dB attenuation [5], and draws 21 µA. A reading below 2.5 V cannot come from a working cell and is reported as no battery.`),
  EQ("div", "V_{ADC} = V_{bat} · R_{4} / (R_{3} + R_{4})"),
  H3("3.9.3 Buzzer driver, LED and I²C bus."),
  P(`The base current ${E("ib")} of Q1 is (3.3 − 0.7) V / 1 kΩ ≈ 2.6 mA; for a 25 mA buzzer the forced gain of about 10 saturates the 2N2222, and D1 clamps the turn-off spike. The LED current ${E("led")} is (3.3 − 2.0) V / 330 Ω ≈ 3.9 mA. The I²C rise time ${E("tr")} with 4.7 kΩ and 50 pF is about 0.20 µs, within the 0.3 µs limit of 400 kHz fast mode.`),
  EQ("ib", "I_{B} = (V_{GPIO} − V_{BE}) / R_{1}"),
  EQ("led", "I_{LED} = (V_{CC} − V_{F}) / R_{2}"),
  EQ("tr", "t_{r} ≈ 0.8473 · R · C"),
  H3("3.9.4 Beacon transmit power."),
  P("At +3 dBm the beacons were near the −88 dBm floor at 2.45 m. At 1 m the reading rose from −61 to −55 dBm when the power was raised to +9 dBm, a 6 dB gain extending the usable range from about 4 m to 7–8 m. All beacons therefore transmit at +9 dBm every 100 ms; being mains-powered, this does not affect wearable battery life."),
  H2("3.10 Software Development"),
  P(`**Zone classification.** The scanner accepts only advertisements carrying the project's UUID and major value and keeps a smoothed signal per beacon. Every 200 ms the classifier drops beacons not heard for 2.5 s or weaker than −88 dBm and selects the strongest; a challenger replaces the current zone only when it leads by more than 5 dB for a confirmation time that adapts to the margin — 0.4 s at a lead of 10 dB or more (a clear move) and 1.6 s otherwise (similar signals near a boundary). The adaptive confirmation was introduced after the reported zone was observed to alternate between two beacons of similar strength when people moved near the wearable. When no beacon is heard at all, the zone is declared unknown only after a further 6 s (about 8.5 s of silence in total), and this count pauses while a Wi-Fi scan or connection attempt occupies the radio, which the ESP32 shares between Wi-Fi and BLE; with a 0.4 s count, the house test of 30 Sep 2026 raised a 'location unknown' alert in every hallway and doorway. The structure of the wearable program is shown in ${F("fc_main")} and one classification pass in ${F("fc_zone")} (Appendix G).`),
  P(`**SOS and acknowledgement.** Each press is confirmed by a short tone; presses less than 0.7 s apart are counted and the pattern is sent when no press follows — one press 'Needs assistance', two 'URGENT – please come now', three 'EMERGENCY – immediate help needed' — confirmed by the same number of beeps. A stronger pattern escalates an open SOS and the server retires the weaker alert. A 3 s hold dismisses a false alarm; a soft low tick each second tells the resident to keep holding, and a long low tone marks the dismissal, after which the dashboard shows a green 'SOS cancelled by the resident' notice in place of the red alert. The ticks were added after the 30 Sep demonstration, in which holds released before 3 s were recorded as new calls. Each status reply states how many of the wearable's SOS alerts remain unacknowledged; at zero the wearable leaves SOS mode, ready for a new call. Every delivered alert is logged with its delivery time. The button logic is shown in ${F("fc_sos")} (Appendix G).`),
  P(`**Heart rate.** The MAX30102 is read at 100 samples per second. After a finger is detected and the signal settles for 1.5 s, beat intervals outside 40–180 bpm or more than 25 percent from the running median are rejected, and the rate ${E("bpm")} is computed from the median of the last eight accepted intervals Δt (in milliseconds):`),
  EQ("bpm", "HR = 60 000 / median(Δt)"),
  P(`**Hub and dashboard.** The door node reads its reed switch with a 50 ms debounce and a 30 s heartbeat. In hub mode the same ESP32 runs a WPA2 access point, a DNS server that makes phones open the dashboard as a sign-in page, and a non-blocking HTTP server implementing the same interface as the computer backend, which lets one dashboard page serve both modes. The computer backend (FastAPI with SQLite) reconstructs event time from device uptime, merges a report repeated after a timed-out reply, and keeps critical and warning alerts until acknowledged. A 'location unknown' or 'device not reporting' alert stands for one episode: a repeat is merged while it is uncleared, and it clears itself when the wearable reports a zone again or resumes reporting. The dashboard refreshes every second, is passcode-protected, follows the phone's light or dark setting, and sounds an alarm with vibration for an unacknowledged SOS. The hub's request handling and alert rules are shown in ${F("fc_hub")} (Appendix G).`),
  H2("3.11 Prototype Development"),
  P(`The door node and beacons are built on perfboard and the wearable on the etched Revision C3 board, with modules on headers as approved by the adviser on 24 September 2026. Enclosures for the wearable (${F("encl")}), the beacons and the door node were modelled parametrically and 3-D printed in PLA.`),
  ...fig("encl", "Wearable_Enclosure_Exploded.png", COL, "Wearable enclosure, exploded view (3-D model): base, power deck and lid."),
  H2("3.12 Design Constraints and Decision Matrix"),
  P(`${T("matrix")} compares candidate localization technologies; weights reflect the needs of a home for the aged and scores (1–5) are the team's assessment informed by Chapter 2. ${T("constraints")} lists the other design constraints.`),
  ...table("matrix", "Weighted decision matrix — localization technology", ["Criterion (weight)", "BLE", "Wi-Fi RSSI", "UWB", "RFID", "GPS"], [
    ["Indoor reliability (0.30)", "4", "3", "5", "3", "1"], ["Cost per zone (0.25)", "5", "4", "2", "3", "4"],
    ["Wearable power (0.20)", "4", "2", "3", "3", "2"], ["ESP32 integration (0.15)", "5", "5", "2", "2", "3"],
    ["Positioning accuracy (0.10)", "3", "3", "5", "2", "1"], ["**Weighted score**", "**4.30**", "3.35", "3.40", "2.75", "2.25"],
  ], [3, 1, 1.2, 1, 1, 1]),
  ...table("constraints", "Design constraints and decisions", ["Constraint", "Decision and justification"], [
    ["Localization", "BLE beacons, one per zone; strongest beacon wins"],
    ["Backend hosting", "Door node as stand-alone hub (demonstrated); computer server as the alternative; cloud hosting for remote viewing designed, not deployed"],
    ["Caregiver interface", "Web page on any phone; no native application"],
    ["Security and privacy", "WPA2 network, passcode with lock-out, data on site [13]"],
    ["Wearable regulation", "Boost to 5 V plus board regulator; low-dropout parts unavailable"],
    ["Fabrication", "Etched single-sided wearable board and perfboard nodes (adviser-approved)"],
    ["Societal — SDG 3", "Subscription-free, locally maintainable components [4]"],
  ], [1.3, 3]),
  H2("3.13 Engineering Tools"),
  P("KiCad 9 (schematic, layout, design-rule check), Blender with a Bambu Lab A1 printer (enclosures), PlatformIO with the Arduino framework (firmware), Python with FastAPI and SQLite (backend), Python analysis scripts, and Git for version control."),
  H2("3.14 Descoped Features"),
  ...table("descoped", "Features descoped from the prototype", ["Feature", "Reason", "Status"], [
    ["GPS and GSM (SIM800L)", "Unreliable indoors [3]; 2G sunset risk", "Removed (adviser)"],
    ["Fall detection", "Priority on localization and SOS", "Removed (adviser)"],
    ["Native mobile app", "Browser works on every phone", "Not developed"],
    ["Low-dropout regulator", "No part sourced in time", "Boost converter used"],
    ["MAX17043 fuel gauge", "Not delivered in time", "Divider used; firmware ready"],
    ["Measured 24 h runtime", "No full discharge test possible", "Calculated only"],
    ["Remote viewing, push notifications", "Needs cloud hosting (open decision)", "Built and tested locally; further study"],
  ], [1.6, 2, 1.6]),
];

// =============================================================================
// CHAPTER 4 — DATA AND RESULTS
// =============================================================================
const run1Points = [
  ["BW-near (first visit)", "113", "83 %", "0 %", "MR 17 %*"], ["BW-near (second visit)", "28", "93 %", "0 %", "MR 7 %"],
  ["BW-mid", "41", "0 %", "0 %", "MR 100 %"], ["BW-far", "17", "0 %", "0 %", "MR 100 %"],
  ["BW-boundary, from inside", "26", "54 %", "46 %", "—"], ["BW-boundary, from outside", "46", "0 %", "100 %", "—"],
  ["DH-near", "31", "100 %", "0 %", "—"], ["DH-mid", "18", "100 %", "0 %", "—"], ["DH-far", "19", "100 %", "0 %", "—"],
  ["DH-boundary, from inside", "24", "83 %", "17 %", "—"], ["DH-boundary, from outside", "12", "0 %", "100 %", "—"],
  ["MR-near", "22", "100 %", "0 %", "—"], ["MR-mid", "25", "16 %", "0 %", "BW 84 %"], ["MR-far", "28", "100 %", "0 %", "—"],
  ["MR-boundary, from inside", "25", "8 %", "84 %", "BW 8 %"], ["MR-boundary, from outside", "20", "0 %", "100 %", "—"],
];
const ch4 = [
  H1("Chapter 4: Testing, Presentation and Interpretation of Data"),
  P("Each test is presented with its purpose, assumptions and constants, procedure, data and analysis, following Sections 3.1 to 3.4. Raw captures are kept unmodified in the project repository."),
  H2("4.1 Test 1 — Received Signal Strength versus Distance"),
  P(`**Purpose.** To fit the log-distance model ${E("pathloss")} for converting signal strength into distance. **Constants.** One beacon at +9 dBm, 1.5 m high; wearable 0.75 m high; line of sight. **Procedure.** At 1.0, 1.5, 2.0, 4.0 and 6.0 m the stationary wearable captured at least 60 samples; two runs with independent beacons are reported (A: 492 samples; B: 459). **Data.** ${T("t1")}, ${T("fit")} and ${F("t1")}.`),
  ...table("t1", "Test 1 results", ["d", "n (A)", "Mean (dBm)", "SD (dB)", "Resid. A", "Resid. B"], [
    ["1.0 m", "68", "−72.3", "2.41", "−0.3", "+0.1"], ["1.5 m", "100", "−71.1", "2.28", "+1.4", "+1.5"],
    ["2.0 m", "137", "−75.5", "2.14", "−2.6", "−3.2"], ["4.0 m", "92", "−70.4", "3.05", "+3.3", "+3.5"], ["6.0 m", "95", "−76.1", "2.47", "−1.9", "−1.8"],
  ], [0.9, 0.9, 1.2, 1, 1, 1]),
  ...table("fit", "Fitted path-loss model", ["Run", "Exponent n", "R²"], [["A — bedroom_wing", "0.28", "0.118"], ["B — dining_hall", "0.55", "0.302"]], [2, 1, 1]),
  ...fig("t1", "f2_test1.png", COL, "Mean received signal strength against distance, run A."),
  P(`**Analysis.** Both exponents are far below 2.0, the free-space value and physical lower bound, so neither was used. The standard error ${E("se")} of each mean is about 0.3 dB, yet deviations from the model reach 3.5 dB, and the residual pattern is nearly identical for two independent beacons — a property of the positions, not the transmitters. This is consistent with standing-wave fading at the 12.5 cm wavelength [7], [8]. Distance estimation is unreliable here; classification by comparison between beacons is unaffected.`),
  H2("4.2 Beacon Transmit Power and Matching"),
  P(`**Purpose.** To ensure equal effective power, since unequal power biases classification. **Procedure.** Each beacon was measured alone at 1 m (21 Sep), then side by side and spaced 30 cm apart with two beacons exchanged (24 Sep). **Data.** ${T("match")}.`),
  ...table("match", "Beacon matching at 1 m (+9 dBm)", ["Beacon", "Alone", "Side by side", "Spaced, swapped"], [
    ["bedroom_wing", "−67.0", "−72.8", "−67.0"], ["dining_hall", "−65.0", "−62.2", "−71.1"], ["medicine_room", "−67.0", "−61.7", "−69.1"], ["**Spread (dB)**", "2", "11", "4"],
  ], [1.6, 1, 1.2, 1.3]),
  P("**Analysis.** Measured alone, the beacons agree within 2 dB; the 11 dB spread side by side followed the position when beacons were exchanged, so it was caused by placement. Beacons are therefore mounted apart, at equal height and orientation."),
  H2("4.3 Test 2 — Zone Classification, Run 1 (Earlier Firmware)"),
  P(`**Constants.** Firmware f5b2e92: α = 0.35, floor −88 dBm, hysteresis 4 dB, 3 confirmation checks, 300 ms period. The bedroom_wing and medicine_room beacons shared one room. **Procedure.** 16 labelled points (near, mid, far and boundary per zone), 24 Sep 2026; first 5 s after each label discarded. **Data.** ${T("r1cm")}, ${T("r1zone")}, ${T("r1pts")} and ${F("r1")}.`),
  ...table("r1cm", "Run 1 confusion matrix (rows: true; columns: reported)", ["True", "BW", "DH", "MR", "Unkn.", "Total"], [
    ["bedroom_wing", "134", "0", "79", "58", "271"], ["dining_hall", "0", "88", "0", "16", "104"], ["medicine_room", "23", "0", "56", "41", "120"],
  ], [1.8, 0.8, 0.8, 0.8, 0.9, 0.9]),
  ...table("r1zone", "Run 1 per-zone metrics", ["Zone", "n", "P", "R", "F1"], [
    ["bedroom_wing", "271", "0.854", "0.494", "0.626"], ["dining_hall", "104", "1.000", "0.846", "0.917"], ["medicine_room", "120", "0.415", "0.467", "0.439"],
    ["**Accuracy**", "495", "", "**56.2 %**", ""], ["**Unresolved**", "", "", "**23.2 %**", ""],
  ], [1.8, 0.8, 0.9, 0.9, 0.9]),
  WIDE([...table("r1pts", "Run 1 per-point results", ["Point", "n", "Correct", "Unresolved", "Most common wrong answer"], run1Points, [3, 0.8, 1.2, 1.3, 2.4], FULL),
    PN("* The first 24 s at BW-near were recorded while the tester was still arriving; after arrival the point classified correctly throughout.", { spacing: { after: 120 } })]),
  ...fig("r1", "f3_test2.png", COL, "Recall by zone, Test 2 Run 1."),
  P("**Analysis.** There were no cross-room errors across the wall. In the shared room, points beyond about 1 m from a beacon were confused, and all 115 unresolved samples occurred at boundaries where every beacon was below the floor. An a-priori prediction (74 % overall, 21 % unresolved) matched the unresolved rate; accuracy was lower because the prediction assumed separate rooms. These findings led to the larger hysteresis, adaptive confirmation and shorter timing of the final firmware (Section 3.10)."),
  H2("4.4 Three-Beacon Walk on the Final Firmware (Functional Check)"),
  P(`**Purpose.** To verify, before the controlled run, that the final firmware follows a person between all three beacons. **Procedure.** On 30 Sep 2026 (00:22–00:37) the team walked between the beacons while the wearable's log was captured; the true position was not recorded, so the walk verifies function but does not score accuracy. **Data.** ${T("walk")} and ${F("walk")}.`),
  ...table("walk", "Zone changes reported during the walk", ["Time", "Reported zone", "Strongest (dBm)"], [
    ["00:25:13", "Medicine Room (restricted)", "−51.3"], ["00:25:25", "Dining Hall", "−71.8"], ["00:25:26", "Bedroom Wing", "−66.3"],
    ["00:27:21", "Medicine Room (restricted)", "−56.1"], ["00:27:37", "Bedroom Wing", "−64.8"], ["00:27:45", "Dining Hall", "−59.4"],
    ["00:27:59", "Bedroom Wing", "−63.2"], ["00:32:35", "Medicine Room (restricted)", "−56.3"], ["00:32:41", "Bedroom Wing", "−75.0"],
    ["00:33:06", "Dining Hall", "−56.9"], ["00:33:24", "Bedroom Wing", "−53.8"],
  ], [1, 2.2, 1.2]),
  ...fig("walk", "f6_walk_timeline.png", COL, "Walk of 30 Sep 2026: reported zone (top) and smoothed signal of each beacon sampled every 30 s from the log (bottom)."),
  P("**Analysis.** All three beacons were received (B1 −53 to −84 dBm, B2 −56 to −93 dBm, B3 −51 to −82 dBm) and the wearable reported eleven zone changes, raising a restricted-zone alert at each of the three entries into the medicine room. The Dining Hall to Bedroom Wing change within 1 s at 00:25:25 is either walking past the dining beacon or a brief reversal; Run 1 (Section 4.3) quantifies such effects in a controlled layout."),
  H2("4.5 Final Firmware in a Shared-Room Layout (Signal Snapshot)"),
  P(`**Purpose.** To examine, on the final firmware, how the three beacons are received in a layout where two safe zones share one open room and the restricted zone is behind a wall — the arrangement of the defense demonstration. **Constants.** Room mode, α = 0.4, floor −88 dBm, hysteresis 5 dB, confirmation 0.4 s or 1.6 s, 200 ms period, 2.5 s staleness, zone unknown after a further 6 s without any beacon (firmware of 1 Oct 2026); beacons +9 dBm, 100 ms. **Layout.** A single dormitory unit on 1 Oct 2026: the dining-hall beacon in the kitchen area near the main door; the bedroom-wing beacon on the bed frame about 4 m from it in the same open room; the medicine-room beacon in the comfort room, about 2 m from the bedroom-wing beacon but behind a wall; the door node on the comfort-room door. Three people were present, two of them seated. **Procedure.** A controlled run over 15 points was carried out, but its capture file was overwritten before analysis, so no Run 3 confusion matrix is reported and zone accuracy rests on Run 1 (Section 4.3). The only preserved record is the first 9 s at the starting position in the open room, given in ${T("r3snap")}.`),
  ...table("r3snap", "Smoothed signal at the starting position, 1 Oct 2026 (dBm, one line per second)", ["Time (s)", "Bedroom", "Dining", "Medicine", "Reported zone"], [
    ["2.7", "−73", "−69", "−93", "dining_hall"], ["3.7", "−68", "−67", "−91", "dining_hall"], ["4.7", "−69", "−69", "−90", "dining_hall"],
    ["5.7", "−69", "−69", "−88", "dining_hall"], ["6.7", "−67", "−69", "−88", "dining_hall"], ["7.7", "−67", "−68", "−89", "dining_hall"],
    ["8.7", "−66", "−68", "−89", "dining_hall"],
  ], [0.9, 1, 1, 1, 1.4]),
  P("**Analysis.** The wearable reported its first zone within 0.4 s of its first status line and then held it. At this position the two beacons sharing the room were received within 0 to 4 dB of each other, while the beacon behind the wall was 19 to 24 dB weaker. With a 5 dB hysteresis, the reported zone therefore does not change until one of the two open-room beacons leads clearly, which happens only close to it; the team correspondingly observed that the bedroom-wing zone registered slowly when approached across the room. A wall, by contrast, gives a margin of about 20 dB, consistent with the absence of cross-room errors in Run 1. Mounting the bedroom-wing beacon on a metal bed frame, low and close to the mattress, is also expected to weaken and distort its signal. For the demonstration the two safe zones are therefore placed at opposite ends of the room, with the restricted zone behind the door, and the beacons are mounted 1.2–1.5 m high, clear of metal."),
  H2("4.6 SOS Delivery Time, Urgency Patterns and Dismissal"),
  P(`**Purpose.** To measure the time from a completed SOS pattern to its storage by the hub, and to verify patterns, escalation, acknowledgement and dismissal. **Procedure.** On 1 Oct 2026 (02:18–02:20, house, door node as the stand-alone hub) the tester entered, with each SOS acknowledged on a phone before the next: three single presses, one two-press pattern, two three-press patterns sent while an SOS was open (escalations), and one 3 s hold on an open SOS. The planned ten single presses and five dismissals were not all completed, so n = 6. The wearable timed each delivery on its own clock, from the moment the pattern was complete to the hub's reply; display on the dashboard adds at most one refresh interval (1 s). **Data.** ${T("sos")}.`),
  ...table("sos", "SOS delivery time and pattern outcomes", ["Measure", "Result"], [
    ["SOS delivery time, n = 6 (mean / median)", "295 / 295 ms"], ["Minimum / maximum", "166 / 408 ms"],
    ["Individual deliveries", "197, 327, 166, 262, 408, 408 ms"],
    ["1, 2 and 3 presses produced the matching message", "6 of 6 (3 × one, 1 × two, 2 × three)"], ["Three-press escalations sent as EMERGENCY", "2 of 2"],
    ["Acknowledgement cleared the wearable", "3 of 3"], ["Dismissal by a 3 s hold (open SOS cancelled)", "1 of 1; delivered in 446 ms"],
  ], [2.6, 1.4]),
  H2("4.7 Heart Rate Compared with a Pulse Oximeter"),
  P(`**Procedure.** The wearable's sensor and a fingertip oximeter were applied to fingers of opposite hands at rest; at each of ten readings the oximeter value was recorded and the wearable's value was the median of its reports over the next 10 s. Two readings were obtained on 1 Oct 2026, one in each of two sessions (02:07 and 02:20), one person at rest; the planned ten were not completed, so the result is preliminary. **Data.** ${T("hr")}, evaluated with ${E("mae")} and ${E("bias")}.`),
  ...table("hr", "Heart rate: wearable against pulse oximeter (bpm)", ["#", "Oximeter", "Wearable", "Error"], [
    ["1", "109", "112", "+3"], ["2", "85", "85.5", "+0.5"],
    ["**MAE / bias (n = 2)**", "", "", "1.75 / +1.75"], ["**Within ±5 bpm**", "", "", "2 of 2"],
  ], [0.8, 1.2, 1.2, 1.2]),
  P("The heart rate is displayed for information only; the system raises no heart-rate alert."),
  H2("4.8 Door Sensor Reliability and Latency"),
  P(`**Procedure.** Door detection was verified in two sessions: the integration test of 29 Sep 2026 on the facility network, and the integrated demonstration of 30 Sep 2026 with the door node operating as the hub. Detection rate is computed by ${E("det")}. The planned 20-cycle reliability test was not performed (Section 4.13). **Data.** ${T("door")}.`),
  ...table("door", "Door sensor results", ["Test", "Cycles", "Detected", "Delivery / false events"], [
    ["29 Sep, facility network", "3", "3 (100 %)", "0.09–0.96 s to the server"], ["30 Sep, hub (demonstration)", "1", "1 (100 %)", "opened and closed shown on the dashboard; no other door event in the screenshots"],
  ], [1.8, 0.8, 1.1, 1.8]),
  H2("4.9 Operation during Network Loss"),
  P(`**Purpose.** To verify that an event raised while the wearable cannot reach the server is kept and delivered later with its original time. **Procedure.** The planned trials with the hub switched off during an SOS were not performed (Section 4.13). Four occurrences recorded during other tests are reported instead: three zone-change alerts raised at start-up on 1 Oct 2026, before the wearable had joined the hub, and one zone change raised during a Wi-Fi dropout in the demonstration of 30 Sep 2026. **Data.** ${T("wifi")}.`),
  ...table("wifi", "Events delivered after the network was unavailable", ["Event", "Raised to delivery", "Shown with original time"], [
    ["Zone change at start-up, 1 Oct 02:06", "8.1 s", "Not observed"], ["Zone change at start-up, 1 Oct 02:18", "7.5 s", "Not observed"],
    ["Zone change at start-up, 1 Oct 02:20", "11.1 s", "Not observed"], ["Zone change during a dropout, 30 Sep 21:51", "Not logged", "Yes, marked 'delivered late'"],
  ], [2, 1.1, 1.5]),
  P("**Analysis.** Every event raised while the link was down was delivered once the wearable reconnected, 7.5 to 11.1 s later in the logged cases, and the dashboard kept the original time and flagged the late delivery. The start-up delay is set by the first join to the hub, which failed once at each of the three logged start-ups with a WPA2 handshake timeout and succeeded on the retry about 4 s later."),
  H2("4.10 Dashboard and Hub Verification"),
  P(`**Computer backend.** An automated self-test covering zones, restarts, out-of-order delivery, door states, the SOS lifecycle and acknowledgement passed 38 of 38 checks (24 Sep, repeated 30 Sep); a repeated SOS report was confirmed to be merged rather than stored twice. **Stand-alone hub.** A computer joined to the hub's network ran the page, passcode, lock-out, data contract, clock, door state, captive-portal redirection and simultaneous-polling checks (${T("hub")}); ${F("dash")} shows the dashboard on a phone.`),
  ...table("hub", "Hub verification (29–30 Sep 2026)", ["Measurement", "Result"], [
    ["Network checks passed", "17 of 17"], ["Page load (15 KB compressed)", "78–97 ms"],
    ["4 clients polling 1 s for 10 s (104 requests)", "median 32 ms, worst 60 ms"], ["Request with 3 idle connections", "47 ms"],
    ["Wearable connection held", "10 min, −34 to −52 dBm, no drop"], ["Dashboard opened on joining", "Android and iPhone"],
  ], [2.4, 1.6]),
  ...fig("dash", "f4_dashboard_phone.png", 2600, "Caregiver dashboard on a phone with an urgent SOS awaiting acknowledgement (test data)."),
  P("**Finding.** In the first phone test the hub sometimes took more than 4 s to answer the wearable: each reply was written in one blocking call, and a phone in Wi-Fi power-save mode receiving a 10 KB summary through the 5.7 KB send buffer held up every other client. Replies are now sent without blocking and simultaneous polls share one summary."),
  P("**Integrated demonstration without a computer (30 Sep 2026, house).** Two beacons (dining hall and medicine room, in separate rooms), the door node running as the SESEMSG hub and the wearable were exercised through the demonstration sequence and recorded on video. Phone screenshots of the hub's dashboard (the hub keeps its history in memory only, and restarted later that night) show, between 21:55 and 21:58: the medicine-room door opened and closed, entry into the restricted zone, the return to the dining hall, two SOS alerts, and acknowledgement by named caregivers from more than one phone; a zone change sent while the wearable's Wi-Fi was down arrived later marked 'delivered late'. The run also exposed three defects, corrected on 1 Oct 2026: wearable Wi-Fi dropouts of up to 64 s produced a new 'device not reporting' alert every 5 s once the previous one was acknowledged; 'location unknown' was raised at every passage through a space without a beacon; and holds released before 3 s were recorded as new SOS calls rather than dismissals (Section 3.10). No delivery time is derived from this run, because no serial log was captured and the screenshots show minutes only."),
  H2("4.11 Wearable Hardware Self-Test"),
  P(`**Purpose.** To verify each subsystem of the assembled wearable independently. **Procedure.** A diagnostic program flashed on 30 Sep 2026 scanned both I²C buses, read the battery-sense input, the button, the buzzer and LED, and scanned Wi-Fi and BLE. **Data.** ${T("selftest")}.`),
  ...table("selftest", "Wearable hardware self-test (30 Sep 2026)", ["Subsystem", "Result"], [
    ["MAX30102 (I²C 0x57)", "Found, part ID 0x15; IR 616 with no finger"], ["Fuel-gauge bus", "Empty (gauge not fitted)"],
    ["SOS button (GPIO 27)", "Released at rest"], ["Buzzer and LED", "3 beeps and flashes"],
    ["Wi-Fi radio", "11 networks, strongest −21 dBm"], ["BLE radio", "65 advertisers received"],
    ["Battery sense (GPIO 34)", "**0.28 V — no battery voltage on the sense line**"],
  ], [1.6, 2.4]),
  H2("4.12 Power Supply Verification"),
  P("During the first power-up of the breadboard wearable a development board failed: the MT3608 output measured 17.64 V unloaded, its factory setting. After adjustment to 5.03 V a replacement board worked normally, and the adjustment became a required service step."),
  P(`On 30 Sep 2026 the wearable ran from USB but not from its battery: the MT3608 gave 5.01 V unloaded but fell to about 3.2 V with the wearable connected, and a second, new module behaved identically. Voltages measured along the power path under load are given in ${T("power")} and ${F("power")}.`),
  ...table("power", "Voltages along the power path under load", ["Point", "Measured (V)", "Expected (V)"], [
    ["Battery terminals", "3.83", "3.7–4.2"], ["TP4056 B+", "3.76", "= battery"], ["TP4056 OUT+", "3.76", "= battery"],
    ["MT3608 VIN", "**3.42**", "= battery"], ["MT3608 VOUT", "**3.25**", "5.0"],
  ], [1.8, 1.2, 1.2]),
  ...fig("power", "f5_power_path.png", COL, "Voltage along the wearable power path with the load connected (multimeter, 30 Sep 2026)."),
  P("**Analysis.** The design itself passed the design-rule, schematic-parity and electrical-rules checks with no errors, and its 0.8 mm power traces are about 0.01 Ω. The 0.34 V lost between the TP4056 output and the MT3608 input at low average current therefore comes from a physical joint, wire or the switch contact; under the converter's current pulses this loss grows until the converter cannot start, so its output only passes the input voltage less a diode drop. The self-test (Section 4.11) likewise found no battery voltage on the board's battery-sense line, consistent with a break between the charger output and J1. The remedy is to re-solder the TP4056 output to J1 and to test or replace the switch."),
  P("**Follow-up.** On 1 Oct 2026 the battery-sense line read 3.90–3.92 V in the test-day captures, against 0.28 V in the self-test, so the cell now reaches the board. Operation from the cell alone under load was not re-measured."),
  H2("4.13 Tests Not Performed"),
  ...table("notdone", "Tests not performed", ["Test", "Reason", "Recommendation"], [
    ["Zone classification on the final firmware (Run 3)", "The capture of the 15-point run was overwritten before analysis", "Repeat the 15-point run; the logging tool no longer overwrites files"],
    ["Door reliability, 20 cycles", "Time before the defense", "Twenty logged cycles with the hub"],
    ["SOS during a network outage", "Time before the defense", "Three trials with the hub switched off"],
    ["Heart rate, ten readings", "Two readings obtained", "Ten or more readings on several people"],
    ["Battery endurance", "No full discharge possible before the defense; fuel gauge not delivered", "Measure runtime from full charge"],
    ["Low-battery alerting", "Requires a discharging cell", "Verify with a bench supply"],
  ], [1.2, 2, 1.6]),
];

// =============================================================================
// CHAPTER 5
// =============================================================================
const ch5 = [
  H1("Chapter 5: Conclusion and Recommendations"),
  H2("5.1 Conclusions"),
  PN("**Zone detection (objective 1).** BLE classification by the strongest beacon produced no cross-room errors across walls, and the final firmware followed a walker between all three beacons. In the controlled Run 1 the overall accuracy was 56.2 percent, limited by the room that two zones shared: two beacons in one open room are separated only close to each beacon, whereas a wall gives a margin of about 20 dB. A controlled run on the final firmware could not be reported."),
  PN("**Classification without distance.** Test 1 showed that distance estimation from signal strength is unreliable indoors because of standing-wave fading; comparing beacons with hysteresis and adaptive confirmation avoids this dependence."),
  PN(["**Restricted areas and SOS (objectives 2 and 3).** Door and restricted-zone alerts work end to end; the SOS button carries three urgency levels with escalation and dismissal, and acknowledgement returns the wearable to normal operation. Six SOS alerts reached the hub in a median of 295 ms (maximum 408 ms)."]),
  PN(["**Battery and heart rate (objective 4).** On the two readings taken, heart rate was within 3 bpm of the oximeter (mean absolute error 1.75 bpm); more readings and more people are needed before this is a general result. Battery reporting could not be verified on the cell because of the power-path fault of Section 4.12."]),
  PN("**Caregiver interface (objective 5).** The dashboard passed all automated checks and runs on any phone; the door node doubles as a hub, so the system works with or without an internet connection."),
  PN("**Network fallback (objective 6).** Events are queued during outages with a local chirp and delivered with their original time."),
  PN("**Battery endurance (objective 7).** With the 2000 mAh cell the calculated runtime is about 20 h at the present load, short of the 24-hour target, and about 33 h if the load is reduced to 35 mA; the runtime has not been measured."),
  H2("5.2 Recommendations"),
  B("Measure battery runtime; replace the boost-plus-linear chain with a buck-boost converter or a regulator with dropout below 400 mV (about 54 h calculated at 35 mA with the 2000 mAh cell)."),
  B("Use a switch rated at least 1 A in the battery path and short, thick power wiring; verify every power joint under load."),
  B("Report the charging state on the dashboard by sensing the charger's USB input voltage through a resistive divider on a free input pin (plugged in with the cell below 4.15 V: charging; at or above 4.15 V: charged). At present the charging state is shown only by the TP4056 module's own indicator lights, visible through the enclosure window."),
  B("Fit a fuel gauge for accurate state-of-charge reporting: the MAX17043 is supported (the firmware detects it automatically), and a gauge that also reports charge rate, such as the MAX17048, would indicate charging directly."),
  B("Deploy the cloud relay once hosting is decided, and add push notifications for locked phones."),
  B("Improve doorway coverage by tuning the floor or adding beacons; study per-zone thresholds where zones share a room [8], [10]."),
  B("Validate heart rate on more people against clinical equipment; persist the hub's history and add battery backup to door nodes."),
  B("Evaluate a hybrid BLE/UWB design [9] where sub-metre accuracy is needed."),
];

// =============================================================================
// REFERENCES
// =============================================================================
const refs = [
  "Philippine Statistics Authority, “Age and sex distribution in the Philippine population (2020 Census of Population and Housing),” Quezon City, Philippines. [Online]. Available: https://psa.gov.ph/content/age-and-sex-distribution-philippine-population-2020-census-population-and-housing",
  "G. Cipriani, C. Lucetti, A. Nuti, and S. Danti, “Wandering and dementia,” _Psychogeriatrics_, vol. 14, no. 2, pp. 135–142, 2014, doi: 10.1111/psyg.12044.",
  "F. Zafari, A. Gkelias, and K. K. Leung, “A survey of indoor localization systems and technologies,” _IEEE Commun. Surveys Tuts._, vol. 21, no. 3, pp. 2568–2599, 2019.",
  "United Nations General Assembly, “Transforming our world: The 2030 Agenda for Sustainable Development,” A/RES/70/1, 2015.",
  "Espressif Systems, “ESP32 series datasheet.” [Online]. Available: https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
  "Apple Inc., “Proximity beacon specification,” Release R1, 2015.",
  "T. S. Rappaport, _Wireless Communications: Principles and Practice_, 2nd ed. Upper Saddle River, NJ, USA: Prentice Hall, 2002.",
  "R. Faragher and R. Harle, “Location fingerprinting with Bluetooth Low Energy beacons,” _IEEE J. Sel. Areas Commun._, vol. 33, no. 11, pp. 2418–2428, Nov. 2015, doi: 10.1109/JSAC.2015.2430281.",
  "J. Kolakowski, V. Djaja-Josko, M. Kolakowski, and K. Broczek, “UWB/BLE tracking system for elderly people monitoring,” _Sensors_, vol. 20, no. 6, Art. no. 1574, 2020, doi: 10.3390/s20061574.",
  "C. Garcia and S. Inoue, “Relabeling for indoor localization using stationary beacons in nursing care facilities,” _Sensors_, vol. 24, no. 2, Art. no. 319, 2024, doi: 10.3390/s24020319.",
  "_Secondary Cells and Batteries Containing Alkaline or Other Non-Acid Electrolytes — Safety Requirements for Portable Sealed Secondary Cells, and for Batteries Made From Them, for Use in Portable Applications — Part 2: Lithium Systems_, IEC 62133-2:2017.",
  "Bluetooth SIG, “Bluetooth Core Specification.” [Online]. Available: https://www.bluetooth.com/specifications/specs/",
  "Republic of the Philippines, “Data Privacy Act of 2012,” Republic Act No. 10173, Aug. 15, 2012.",
];
const references = [
  H1("References"),
  ...refs.map((r, i) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { left: 400, hanging: 400 }, spacing: { after: 40 },
    children: [t(`[${i + 1}]  `, { size: 16 }), ...runs(r, { size: 16 })] })),
];

// =============================================================================
// APPENDICES (one column, new page)
// =============================================================================
const AH = (text) => new Paragraph({ children: [t(text, { smallCaps: true, bold: true, size: 22 })], alignment: AlignmentType.LEFT, spacing: { before: 240, after: 120 }, keepNext: true });
const appendices = [
  new Paragraph({ children: [t("Appendices", { smallCaps: true, bold: true, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  AH("Appendix A — Bill of Materials"),
  ...table("bom", "Bill of materials of the demonstration system (team purchase record, 1 Oct 2026; * = estimate from Philippine supplier listings, Aug 2026, where no purchase price was recorded)", ["Ref.", "Part", "Qty", "Unit (₱)", "Line (₱)"], [
    ["U1", "ESP32-WROOM-32 DevKitC, 38-pin: wearable, three beacons, door node, and the wearable's first board (failed, replaced)", "6", "350*", "2,100*"],
    ["U2", "MAX30102 heart-rate module", "1", "150*", "150*"],
    ["U3", "MAX17043 fuel gauge (ordered online, not delivered)", "1", "252", "252"],
    ["BT1", "Li-Po cell 3.7 V, 2000 mAh", "1", "154", "154"],
    ["M1", "TP4056 charger with DW01 protection, USB-C (2 used, 2 spare)", "4", "25", "100"],
    ["M2", "MT3608 boost converter (1 used, 2 spare)", "3", "30", "90"],
    ["SW1", "SPDT mini toggle switch, 3 A", "1", "80", "80"],
    ["SW2", "Tactile switch, 12 × 12 mm", "1", "15*", "15*"],
    ["BZ1", "Passive buzzer, 12 mm (pack of 10)", "1 pack", "99", "99"],
    ["Q1, D1, D2, R1–R6, C1–C4; beacon LEDs and 330 Ω", "Transistor, diode, LEDs, resistors, capacitors", "—", "stock", "0"],
    ["—", "Magnetic reed switch with magnet (1 used, 1 spare)", "2", "45", "90"],
    ["—", "Female headers (wearable)", "lot", "100", "100"],
    ["J1 (door)", "2-pin screw terminal (pack of 10)", "1 pack", "90", "90"],
    ["—", "Perfboard, 5 × 7 cm (three beacons, door node)", "4", "26", "104"],
    ["—", "Presensitized fibreglass copper-clad board (wearable PCB)", "lot", "700", "700"],
    ["—", "PLA 3-D printing (enclosures)", "lot", "500", "500"],
    ["—", "USB cable, one per beacon", "3", "50", "150"],
    ["", "**Total**", "", "", "**4,774** (of which 2,265 estimated)"],
  ], [1.1, 3.3, 0.6, 0.8, 1.2], FULL),
  PN("Chargers for the beacons and the door node, wire and solder were already owned and are not included; no JST connectors were used. The schematic lists the 1000 mAh cell first specified; a 2000 mAh cell was fitted."),
  AH("Appendix B — Wearable Schematic"),
  ...fig("sch", "a_schematic_rot.png", 8200, "Wearable schematic, Revision C3 (KiCad; page rotated)."),
  AH("Appendix C — Printed Circuit Board"),
  ...fig("copper", "a_pcb_board.png", 6200, "Revision C3 copper (B.Cu) with component-side silkscreen, 69 × 66 mm; design-rule check: 0 errors, 0 unconnected pads."),
  AH("Appendix D — Door Node and Beacon Construction"),
  ...fig("doorwire", "Door_Node_Wiring.png", 7600, "Door sensor node wiring (reed switch on GPIO 18 with the internal pull-up)."),
  ...fig("beacon", "Beacon_Perfboard_ComponentSide.png", 6400, "Beacon node on perfboard, component side."),
  AH("Appendix E — Enclosures"),
  ...fig("nodes", "Node_Enclosures_Closed.png", 6000, "Beacon and door-node enclosures (3-D model), printed in PLA."),
  AH("Appendix F — Firmware Excerpts"),
  PN("Zone classification with adaptive confirmation (wearable, `classifyZone`):", { spacing: { after: 60 } }),
  ...[
    "float lead = bestRssi - curRssi;",
    "if (lead > HYSTERESIS_DB && bestRssi >= ZONE_ENTRY_DBM) {",
    "  int need = (lead >= FAST_LEAD_DB) ? CONFIRM_TICKS_FAST   // 2 x 200 ms",
    "                                    : CONFIRM_TICKS_SLOW;  // 8 x 200 ms",
    "  if (bestIdx == gCandidateIdx) {",
    "    if (++gCandidateTicks >= need) newIdx = bestIdx;",
    "  } else { gCandidateIdx = bestIdx; gCandidateTicks = 1; }",
    "}",
  ].map(CODE),
  PN("SOS pattern completion (wearable, `sosService`):", { spacing: { before: 120, after: 60 } }),
  ...[
    "if (gPatCount && gBtnStable == HIGH && now - gPatLastEdge >= SOS_PATTERN_GAP_MS) {",
    "  uint8_t level = gPatCount; gPatCount = 0;",
    "  if (!gSosActive || level > gSosLevel) {           // new SOS, or escalation",
    "    const char *msg = level >= 3 ? SOS_MSG_3 : level == 2 ? SOS_MSG_2 : SOS_MSG_1;",
    "    gSosActive = true; gSosLevel = level;",
    "    raiseAlert(\"sos\", msg, level);                   // 1-3 confirmation beeps",
    "  }",
    "}",
  ].map(CODE),
  PN("Complete source code: private GitHub repository Jeju2004/SESEM (wearable, beacon, door node and hub firmware; dashboard; analysis scripts).", { spacing: { before: 120 } }),
  AH("Appendix G — Software Flowcharts"),
  PN("Drawn from the firmware and hub source code with ANSI flowchart symbols: rounded rectangle = start or end, rectangle = process, diamond = decision, parallelogram = input or output.", { keepNext: true }),
  ...fig("fc_main", "fc_main.png", FULL, "Wearable firmware: main loop, BLE scanning task and network task, which run concurrently on the two cores of the ESP32."),
  ...fig("fc_zone", "fc_zone.png", FULL, "Zone classification pass on the wearable, executed every 200 ms."),
  ...fig("fc_sos", "fc_sos.png", 7200, "SOS button logic on the wearable, executed on every pass of the main loop."),
  ...fig("fc_hub", "fc_hub.png", FULL, "Hub request handling and alert rules; the computer backend applies the same rules."),
  AH("Appendix H — Test Data"),
  PN("Raw captures (unmodified) and analysis outputs: Test 1 (21 Sep 2026), Test 2 Run 1 and results (24 Sep 2026), three-beacon walk (30 Sep 2026), demonstration screenshots (30 Sep 2026) and test-day captures (1 Oct 2026: sos2.csv, hr.csv, hr2.csv, and the 9 s test2_run3.csv), with the analysis scripts named in Table I."),
  AH("Appendix I — User's Manual and Panel Access Card"),
  PN("The User's Manual is a separate document. The access card below lets panel members join the hub's network and open the dashboard.", { keepNext: true }),
  ...fig("qr", "a_qr_card_one.png", 7200, "Panel access card: QR code 1 joins the SESEMSG network; QR code 2 opens the dashboard."),
  AH("Appendix J — Signed Forms"),
  PN("The signed progress reports and the Design Oral Presentation and Billing Form (FM-EEC-25) are attached to the printed copies."),
];

// =============================================================================
// ASSEMBLY — sections: title (1 col) · body (2 col, with full-width blocks) ·
// balance break · appendices (1 col, new page)
// =============================================================================
const page = { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 900, bottom: 1440, left: 900 } };
const footers = { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 })] })] }) };
const two = { count: 2, space: 360, equalWidth: true };
const body = [...abstract, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...references];
const sections = [{ properties: { page }, footers, children: title }];
let run = [];
const flush = () => { if (run.length) { sections.push({ properties: { type: SectionType.CONTINUOUS, page, column: two }, footers, children: run }); run = []; } };
for (const item of body) {
  if (item && item.wide) {
    flush();
    sections.push({ properties: { type: SectionType.CONTINUOUS, page, column: { count: 1 } }, footers, children: item.wide });
  } else run.push(item);
}
flush();
// a continuous one-column break balances the two columns of the last page
sections.push({ properties: { type: SectionType.CONTINUOUS, page, column: { count: 1 } }, footers, children: [new Paragraph({ children: [] })] });
sections.push({ properties: { type: SectionType.NEXT_PAGE, page, column: { count: 1 } }, footers, children: appendices });

// every numbered item must appear exactly once, in its declared order
const check = (used, list, what) => {
  const missing = list.filter((k) => !used.includes(k));
  if (missing.length) throw new Error(`${what} declared but never placed: ${missing.join(", ")}`);
  used.forEach((k, i) => { if (k !== list[i]) throw new Error(`${what} out of order: ${k} is #${i + 1}, declared #${list.indexOf(k) + 1}`); });
};
check(usedT, TABLES, "table"); check(usedF, FIGS, "figure"); check(usedE, EQS, "equation");

const doc = new Document({
  creator: "Chester John B. Cirio; Pathrish Anne R. Cruz", title: "TroDes — IEEE-format paper, Revision 6",
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections,
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length, `| ${TABLES.length} tables, ${FIGS.length} figures, ${EQS.length} equations`); });
