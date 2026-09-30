// TroDes IEEE-format paper, Revision 4 draft (30 Sep 2026). Usage: node paper.js <out.docx>
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat, Footer, PageNumber, TableOfContents, ImageRun,
} = require("docx");

const OUT = process.argv[2];
const SCR = path.join(__dirname, "figures");
const FONT = "Times New Roman";

// ---------- helpers ----------
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
const tbd = (text) => new TextRun({ text: `[${text}]`, font: FONT, highlight: "yellow", bold: true });
function runs(parts) {
  const list = Array.isArray(parts) ? parts : [parts];
  const out = [];
  for (const p of list) {
    if (typeof p !== "string") { out.push(p); continue; }
    const re = /(\*\*[^*]+\*\*|(?<![A-Za-z0-9])_[^_]+_(?![A-Za-z0-9])|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(p))) {
      if (m.index > last) out.push(t(p.slice(last, m.index)));
      const s = m[0];
      if (s.startsWith("**")) out.push(t(s.slice(2, -2), { bold: true }));
      else if (s.startsWith("_")) out.push(t(s.slice(1, -1), { italics: true }));
      else out.push(new TextRun({ text: s.slice(1, -1), font: "Courier New", size: 20 }));
      last = m.index + s.length;
    }
    if (last < p.length) out.push(t(p.slice(last)));
  }
  return out;
}
const P = (parts, o = {}) => new Paragraph({ children: runs(parts), alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 264 }, ...o });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text)], pageBreakBefore: true });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(text)] });
const B = (parts) => new Paragraph({ children: runs(parts), numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 } });
let curList = 0;
const restart = () => { curList++; return []; };
const N = (parts) => new Paragraph({ children: runs(parts), numbering: { reference: `steps${curList}`, level: 0 }, spacing: { after: 60 } });
const EQ = (text) => new Paragraph({ children: [t(text, { italics: true })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 } });
const CAP = (text, keepNext = true) => new Paragraph({ children: [t(text, { bold: true, size: 20 })], alignment: AlignmentType.CENTER, keepNext, spacing: { before: 60, after: 200 } });
const TODO = (text) => new Paragraph({ children: [tbd(text)], spacing: { after: 160 } });
const SP = () => new Paragraph({ children: [], spacing: { after: 80 } });
function fig(file, wIn, capText) {
  const buf = fs.readFileSync(path.join(SCR, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const wPx = Math.round(wIn * 96), hPx = Math.round(wPx * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, keepNext: true, children: [new ImageRun({ type: "png", data: buf, transformation: { width: wPx, height: hPx } })] }),
    CAP(capText, false),
  ];
}
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(caption, header, rows, widths, fontSize = 20) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (content, w, isHead) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: "E7E6E6" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: (isHead ? [t(content, { bold: true, size: fontSize })] : runs(content).map((r) => r)), spacing: { after: 0 } })],
  });
  // apply font size to body runs
  const sized = (c) => (typeof c === "string" ? c : c);
  return [
    CAP(caption),
    new Table({
      width: { size: total, type: WidthType.DXA }, columnWidths: widths,
      rows: [
        new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true)) }),
        ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(sized(c), widths[i], false)) })),
      ],
    }),
    SP(),
  ];
}

// ---------- front matter ----------
const front = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 120 }, children: [t("SMART ELDERLY SAFETY AND EMERGENCY MONITORING SYSTEM WITH GEOFENCING:", { bold: true, size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [t("An Indoor BLE-Based Localization and Safety Monitoring System for a Home for the Aged", { bold: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Chester John B. Cirio and Pathrish Anne R. Cruz")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("School of Electrical, Electronics and Computer Engineering, Mapúa University")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Electronics Design · Section C1 · Adviser: Engr. Glenn V. Magwili")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [t("IEEE-Format Paper — Revision 4 Draft, 30 September 2026", { italics: true })] }),
  new Paragraph({ children: [t("Abstract", { bold: true, italics: true }), t("—", { bold: true }),
    t("Residents of homes for the aged, particularly those with cognitive decline, may enter unsafe areas or need help when no caregiver is nearby, and satellite-based tracking products do not work reliably indoors. This paper presents TroDes, an indoor monitoring system in which an ESP32-based wearable identifies the resident's zone by selecting the strongest of the Bluetooth Low Energy (BLE) beacons installed one per zone, and reports the zone, battery level, heart rate and resident-initiated SOS alerts of three urgency levels to a web-based caregiver dashboard; a magnetic reed sensor reports the state of a restricted door. The door sensor node also operates as a stand-alone hub: it creates its own Wi-Fi network, applies the alert rules and serves the dashboard to caregivers' phones, which join by scanning a QR code, so that the system needs no computer, router or internet connection. Classification uses exponential smoothing, a detection floor, a 5 dB hysteresis and a confirmation time that adapts to the signal margin, and never relies on a distance estimate. A signal-strength-versus-distance test returned path-loss exponents of 0.28 and 0.55, below the free-space value of 2.0, identifying standing-wave fading and confirming that distance estimation is unreliable in the test environment. An initial classification run on earlier firmware produced zero cross-room errors between zones separated by a wall and 56.2 percent overall accuracy where two zones shared one room. ", { size: 20 }),
    tbd("Final classification accuracy, SOS delivery time, heart-rate deviation and door reliability from the 30 September 2026 tests")],
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 } }),
  new Paragraph({ children: [t("Index Terms", { bold: true, italics: true, size: 20 }), t("—Bluetooth Low Energy, indoor localization, elderly care, received signal strength, wearable, embedded web server, Internet of Things, SDG 3.", { size: 20 })], spacing: { after: 240 } }),
  new Paragraph({ children: [t("Contents", { bold: true, size: 26 })], pageBreakBefore: true, spacing: { after: 160 } }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
];

// ---------- Chapter 1 (carried from Rev 2, corrected) ----------
const ch1 = [
  H1("CHAPTER 1: BACKGROUND AND INTRODUCTION"),
  H2("1.1 Overview"),
  P("The Philippine population is ageing. In the 2020 Census of Population and Housing, persons aged 65 years and over accounted for 5.4 percent of the household population, or approximately 5.86 million persons [1]. As the number of older Filipinos grows, so does reliance on residential care facilities such as homes for the aged, where a small number of caregivers must monitor many residents simultaneously. In such settings, two safety concerns dominate: residents wandering into areas that are unsafe or restricted, and residents needing urgent assistance without any staff nearby to notice. This design project proposes an indoor localization and safety monitoring system that identifies a resident's zone within the facility using Bluetooth Low Energy, monitors entry into restricted areas through door sensors, and delivers real-time alerts to caregivers through a web-based dashboard."),
  H2("1.2 Target Customer"),
  P("The primary beneficiaries are elderly residents of a home for the aged, particularly those with cognitive decline or a tendency to wander, who may enter unsafe areas without recognizing the danger. The direct users of the system are the facility's caregivers and staff, who need a way to monitor the location and status of residents continuously without physically checking each room, and to be notified immediately when a resident requires help or enters a restricted area."),
  H2("1.3 Statement of the Problem"),
  P("Care facilities for the elderly face a persistent monitoring gap:"),
  B("Caregiver-to-resident ratios make continuous direct supervision of every resident impractical, especially during night shifts."),
  B("Wandering is a recognized behavioural problem in people with dementia and can lead residents into unsafe areas such as stairwells or medicine storage rooms, or out of the facility unnoticed [2]."),
  B("When a resident needs urgent help, there is often no reliable way to summon a caregiver from wherever the resident happens to be in the facility."),
  B("Existing commercial elderly monitoring products are largely designed for outdoor satellite tracking of individuals and typically require recurring subscriptions, making them poorly matched to an indoor institutional setting."),
  H2("1.4 Proposed Solution"),
  P("The proposed system consists of three parts. First, a wearable device worn by the resident, built around an ESP32 microcontroller, which continuously scans for Bluetooth Low Energy beacons installed throughout the facility and determines which zone the resident is in by comparing their received signal strengths. The wearable also carries a heart rate sensor, a battery voltage measurement, a buzzer, a status LED and an SOS button through which the resident can call for help at three levels of urgency. Second, fixed infrastructure: one BLE beacon per zone, and a magnetic reed sensor on the door of each restricted area. Third, a web-based caregiver dashboard that shows each resident's current zone, classified as safe or restricted, together with battery level and heart rate, and raises real-time alerts for SOS presses, restricted-zone entry, restricted-door openings and low battery. The dashboard can be served by a computer on the facility network or by the door sensor node itself, which then operates as a stand-alone hub with its own Wi-Fi network, so that the system works with no computer, router or internet connection."),
  H2("1.5 Objectives"),
  P("**General objective.** To design and develop an indoor elderly localization and safety monitoring system for a home for the aged, integrating BLE-based zone tracking, restricted-area door monitoring, resident-initiated emergency alerting, and a web-based caregiver dashboard."),
  P("**Specific objectives.**"),
  ...restart(),
  N("To design a wearable device capable of determining the resident's current zone through BLE signal strength from fixed beacons."),
  N("To implement door sensors at restricted-area entry points that generate immediate alerts when a door is opened."),
  N("To implement an SOS button with distinct short-press alert and long-press dismiss behaviour."),
  N("To monitor and report the wearable's battery level and the resident's heart rate to the caregiver dashboard."),
  N("To develop a web-based caregiver interface displaying resident location, device status and active alerts in real time."),
  N("To define and validate a fallback alerting behaviour for periods when network connectivity is unavailable."),
  N("To test and evaluate the system's zone detection accuracy, alert response time and battery endurance against the approved 24-hour runtime target."),
  TODO("Measurable targets still to be confirmed with the adviser: acceptable zone misclassification rate and maximum alert latency (the 24-hour runtime target was approved on 21 September 2026)."),
  H2("1.6 Scope and Limitations"),
  P("**Scope.**"),
  B("The system is designed for a single indoor care facility; outdoor tracking is outside the scope of this project."),
  B("Localization is zone-based, identifying which room or area the resident occupies, with restricted areas flagged for alerting. The demonstration uses three zones: the bedroom wing and dining hall (safe) and the medicine room (restricted)."),
  B("The prototype tracks one wearable device; the architecture scales conceptually to multiple residents."),
  B("The caregiver interface is delivered as a web application accessible from any standard browser, including mobile browsers, served by the door sensor node operating as a stand-alone hub or by a computer on the facility network."),
  B("The prototype is constructed on perfboard as a module-carrier design, as approved by the adviser on 24 September 2026; a single-sided printed circuit board layout was also produced."),
  P("**Limitations.**"),
  B("BLE localization is affected by wall materials, multipath propagation and beacon placement; the system provides zone-level rather than coordinate positioning. Zones that share a room are distinguishable only near their beacons (Chapter 4)."),
  B("The system depends on facility infrastructure — fixed beacons, door sensors and network availability — and is not a standalone wearable-only solution."),
  B("Fall detection is not included; the system detects location and resident-initiated emergencies, not motion events."),
  B("Heart rate readings from an optical sensor on a wearable are indicative rather than clinical-grade and are not intended for medical diagnosis."),
  B("The dashboard is reachable only on the facility network or the hub's own network; viewing from other networks was designed but not deployed. Alerts reach caregivers whose dashboard page is open; notifications to a locked phone are outside the scope."),
  B("The stand-alone hub keeps the alert history in memory; a restart of the hub clears it. The computer backend keeps a persistent history."),
  H2("1.7 Comparison to Existing Products"),
  P("Commercially available elderly monitoring devices such as GPS-based tracking watches and pendants provide location tracking, geofencing and emergency buttons, but they are designed primarily around outdoor satellite positioning and cellular connectivity, and generally require recurring subscription fees. Satellite positioning performs poorly indoors [3], and per-device subscription costs scale badly when a facility must equip many residents. The proposed system uses Bluetooth Low Energy for indoor zone localization, operates over the facility's own local network without per-device subscriptions, and adds fixed door sensors at restricted areas, giving caregivers a definite alert at the specific boundaries that matter most."),
  TODO("Name one or two specific commercial products examined by the team, with citations, to make this comparison concrete."),
  H2("1.8 Significance and Benefits"),
  P("For residents, the system provides a means to summon help from anywhere in the facility and an added safeguard against entering unsafe areas unnoticed. For caregivers, it reduces the burden of continuous physical monitoring and shortens the time between an incident and a response. For the facility, it offers a locally deployable, subscription-free monitoring capability built from commonly available components. The project contributes to Sustainable Development Goal 3, Good Health and Well-Being [4], by supporting the safety of older persons in residential care."),
];

// ---------- Chapter 2 ----------
const ch2 = [
  H1("CHAPTER 2: REVIEW OF RELATED LITERATURE"),
  H2("2.1 Indoor Localization Technologies"),
  P("Zafari, Gkelias and Leung [3] survey indoor localization systems and technologies, including WiFi, Bluetooth, Zigbee, radio-frequency identification (RFID), ultra-wideband (UWB), visible light, acoustic and ultrasound systems, and the techniques used with them: angle of arrival, time of flight, return time of flight and received signal strength (RSS). Satellite positioning, the basis of most consumer tracking products, is designed for outdoor use; inside buildings the satellite signals are attenuated and reflected, which motivates dedicated indoor technologies. Among these, RSS-based methods require no specialised receiver hardware and are supported by commodity radios, at the cost of accuracy that depends strongly on the environment [3]."),
  P("Bluetooth Low Energy is attractive for institutional deployment because its beacons are inexpensive, low-power and simple to install, and because BLE radios are built into common microcontrollers such as the ESP32 used in this project [5]. Beacons that follow the iBeacon format broadcast a proximity identifier with major and minor fields in their advertisement [6], which allows a receiver to identify the zone a beacon represents without establishing a connection."),
  H2("2.2 Radio Propagation and Received Signal Strength"),
  P("The log-distance path-loss model expresses received power as a reference power at 1 m less 10·n·log₁₀(d), where n is the path-loss exponent: n = 2 for free space and typically larger indoors [7]. The model describes the average trend; at any single point, multipath interference adds large position-dependent deviations. Faragher and Harle [8] showed, with 19 beacons over approximately 600 m², that BLE is highly susceptible to fast fading and that the achievable accuracy depends on how that fading is mitigated, for example by combining several advertising channels and filtering over time. These findings bear directly on this project: Chapter 4 reports a path-loss test in which fading dominated the distance trend."),
  H2("2.3 BLE Localization in Elderly and Care Settings"),
  P("Kolakowski et al. [9] developed a hybrid UWB and BLE tracking system for monitoring elderly people. In static tests the median localization error was approximately 23 cm with UWB and approximately 1 m with BLE, and the hybrid approach traded tracking accuracy against energy consumption. Garcia and Inoue [10] deployed 25 stationary BLE beacons on one floor of a nursing care facility to track caregiver locations, and used machine learning with a relabeling data-augmentation technique to improve the classification of rarely visited locations. Both studies confirm that BLE is a practical technology for care settings, and both obtain their accuracy from dense infrastructure or trained models."),
  H2("2.4 Wandering in Dementia"),
  P("Cipriani et al. [2] review wandering as one of the behavioural problems occurring in people with dementia, including its consequences such as injury and elopement, and the approaches used to manage it. The review supports the design choice of alerting caregivers when a resident enters a restricted area, rather than attempting to prevent movement."),
  H2("2.5 Synthesis and Research Gap"),
  P("The reviewed BLE systems pursue coordinate-level or fine-grained accuracy through dense beacon deployments [10], hybrid UWB hardware [9] or fingerprinting [8]. A home for the aged, however, needs to know which room a resident is in and whether that room is restricted, and it needs this at low cost with components that can be maintained locally. This project therefore addresses room-level zone classification with one beacon per zone, using relative signal strength with smoothing and hysteresis instead of distance estimation, combined with door sensors at restricted areas, a resident-operated SOS button and a subscription-free local dashboard."),
  TODO("Optional: add one or two Philippine or ASEAN studies on residential elderly care or monitoring technology, found through IEEE Xplore or local university repositories."),
];

// ---------- Chapter 3 ----------
const ch3 = [
  H1("CHAPTER 3: DESIGN PROCEDURES"),
  H2("3.1 Conceptual Framework"),
  ...table("Table 3.1 Input–process–output framework", ["Input", "Process", "Output"], [
    ["BLE advertisements from the zone beacons", "Filter by project UUID and major; smooth RSSI (EMA, α = 0.4); discard beacons older than 2.5 s or below −88 dBm; select the strongest beacon with 5 dB hysteresis and an adaptive confirmation time (0.4 s when the new zone leads by 10 dB or more, otherwise 1.6 s), evaluated every 200 ms", "Current zone; zone-change and restricted-zone alerts"],
    ["SOS button state", "Debounce (40 ms); count presses separated by less than 0.7 s (1–3); a 3 s hold dismisses", "SOS alert at one of three urgency levels, escalation, or dismissal"],
    ["Battery voltage (divider on GPIO 34)", "16-sample calibrated average; piecewise Li-Po voltage-to-percentage table; below 2.5 V treated as no battery fitted", "Battery percentage; low (20 %) and critical (10 %) alerts"],
    ["Optical pulse signal (MAX30102)", "All samples at 100 samples/s; finger detection and 1.5 s settling; beat intervals limited to 40–180 bpm; outliers beyond ±25 % of the running median rejected; median of the last eight intervals", "Heart rate for display, or no reading"],
    ["Reed switch state (door node)", "Internal pull-up; debounce (50 ms); state-change detection; 30 s heartbeat", "Door opened/closed events; node offline detection"],
    ["Device reports over Wi-Fi", "Hub: stored in memory and served to phones; computer: stored in SQLite. Event time reconstructed from device uptime; repeated reports merged; stale detection (30 s wearable, 90 s door)", "Caregiver dashboard; alerts until acknowledged; SOS acknowledgement returned to the wearable"],
  ], [2600, 4200, 2560]),
  H2("3.2 Block Diagram"),
  P("Figure 3.1 shows the two deployment modes. Beacons only broadcast; the wearable decides the zone itself. In the stand-alone mode (a), which is the configuration demonstrated, the door sensor node also acts as the system hub: it creates a WPA2-protected Wi-Fi network, receives the wearable's reports, applies the alert rules and serves the caregiver dashboard to phones that join the network, with no computer, router or internet connection. In the facility-network mode (b), the wearable and the door node report over the building's Wi-Fi to a computer running the same dashboard with a persistent database. The wearable selects the hub whenever its network is present and otherwise falls back to the facility network; while no network is available it queues events for later delivery and sounds a periodic local chirp."),
  ...fig("f1_arch_v2.png", 6.5, "Fig. 3.1 System block diagram: (a) stand-alone hub, as demonstrated; (b) facility network"),
  H2("3.3 Schematic Diagrams"),
  P("The wearable schematic (Revision B, drawn in KiCad with ANSI/IEEE symbols) is reproduced in Appendix B. It comprises the ESP32 development board (U1), the MAX30102 heart rate module (U2), the optional MAX17043 fuel gauge (U3), the TP4056 charger with DW01 protection (M1), the MT3608 boost converter (M2), the SOS button (SW2), the buzzer driver (Q1, R1, D1, BZ1), the status LED (D2, R2), the battery divider (R3, R4, C4), the I²C pull-ups (R5, R6) and bulk and decoupling capacitors (C1–C3)."),
  TODO("Insert the door sensor node schematic (ESP32, reed switch on GPIO 18 to ground with the internal pull-up, status LED with 330 Ω, screw terminal) and update the wearable title block from Rev B to the build revision."),
  H2("3.4 Applicable Standards and Regulations"),
  P("The following standards apply to the design, subject to confirmation with the adviser:"),
  B("IEC 62133-2 — safety requirements for portable sealed secondary lithium cells and batteries [11], applicable to the wearable's Li-Po cell."),
  B("IEC 62368-1 — safety of audio/video, information and communication technology equipment."),
  B("Bluetooth Core Specification [12] (formerly IEEE 802.15.1) — the BLE advertising used for localization."),
  B("IEEE 802.11 — the Wi-Fi link between the devices and the dashboard; the hub's network uses WPA2 personal security."),
  B("Republic Act No. 10173, the Data Privacy Act of 2012 [13] — the system processes a resident's location and heart rate, which are personal and health information. The design limits access with a dashboard passcode, keeps data on the facility's own equipment by default, and records who acknowledged each alert."),
  H2("3.5 Component Function and Computations"),
  H3("3.5.1 Power chain and runtime"),
  P("No regulator with sufficiently low dropout could be sourced in time, so the wearable uses a boost topology: cell → TP4056/DW01 → slide switch → MT3608 boost to 5.0 V → development-board regulator → 3.3 V. The cell current drawn by the boost converter is"),
  EQ("I_cell = (V_out · I_out) / (η · V_cell)"),
  P("With V_out = 5.0 V, η ≈ 0.88 and V_cell = 3.7 V, a 3.3 V load of 60 mA plus approximately 5 mA regulator quiescent current gives I_cell ≈ (5.0 × 0.065)/(0.88 × 3.7) ≈ 100 mA, and a runtime of 1000 mAh / 100 mA ≈ 10 h. Reducing the load to 35 mA through duty cycling gives I_cell ≈ 61 mA and ≈ 16 h. These are calculated values from nominal capacity; a measured runtime could not be obtained for this report (Section 4.12). The approved 24-hour target is not reachable with this topology, which costs approximately 1.65 times the cell current of a direct low-dropout supply."),
  ...table("Table 3.2 Calculated runtime of the 1000 mAh cell (nominal capacity)", ["3.3 V load", "Cell current", "Runtime"], [
    ["60 mA (continuous scanning, 5 s reports)", "≈ 100 mA", "≈ 10 h"],
    ["35 mA (after duty-cycle reduction)", "≈ 61 mA", "≈ 16 h"],
  ], [4200, 2600, 2560]),
  H3("3.5.2 Battery sense divider"),
  P("R3 = R4 = 100 kΩ gives a ratio of 2.0, so a full cell of 4.2 V presents 2.1 V to GPIO 34, inside the ESP32 ADC's range at 11 dB attenuation [5]. The divider draws 4.2 V / 200 kΩ = 21 µA continuously, which is negligible against the wearable's average current. C4 = 100 nF across R4 filters the ADC input; the firmware averages 16 readings per measurement. A reading below 2.5 V at the cell cannot come from a working Li-Po cell, so it is reported as no battery fitted rather than as 0 percent, which would otherwise raise false low-battery alerts when the wearable is powered from USB."),
  H3("3.5.3 Buzzer driver"),
  P("GPIO 25 drives Q1 (2N2222) through R1 = 1 kΩ, so I_B = (3.3 − 0.7) V / 1 kΩ ≈ 2.6 mA. With a buzzer current of approximately 25 mA the forced gain is about 10, well below the transistor's minimum current gain, so Q1 saturates. D1 (1N4148) is placed across the buzzer, cathode to +5 V, to clamp the inductive voltage spike at turn-off."),
  H3("3.5.4 Status LED and I²C pull-ups"),
  P("R2 = 330 Ω limits the LED current to (3.3 − 2.0) V / 330 Ω ≈ 3.9 mA. The I²C lines use 4.7 kΩ pull-ups, fitted only where the sensor breakout lacks its own. For a bus capacitance of about 50 pF the rise time is t_r ≈ 0.8473 · R · C ≈ 0.20 µs, within the 0.3 µs limit of 400 kHz fast mode."),
  H3("3.5.5 Beacon transmit power"),
  P("At +3 dBm the beacons were near the −88 dBm detection floor at 2.45 m. A reference measurement at 1 m gave −61 dBm at +3 dBm and −55 dBm at +9 dBm, a 6 dB improvement matching the 6 dB power increase, extending the usable range from approximately 4 m to 7–8 m. All beacons are therefore set to +9 dBm and advertise every 100 ms; because beacons are mains-powered, the higher transmit power has no effect on wearable battery life."),
  H2("3.6 Software Development"),
  P("**Wearable — zone classification.** The scanner accepts only advertisements carrying the project's proximity UUID and major value, and maintains an exponentially smoothed RSSI per beacon (α = 0.4). Every 200 ms the classifier discards beacons not heard for 2.5 s or weaker than −88 dBm and selects the strongest remaining beacon. A challenger zone replaces the current zone only when it leads by more than the 5 dB hysteresis for a confirmation time that adapts to the margin: 0.4 s when the lead is 10 dB or more, as when the resident clearly walks into another room, and 1.6 s when the lead is between 5 and 10 dB, as when two similar signals fluctuate near a boundary. The adaptive confirmation was introduced after the team observed the reported zone alternating between two beacons of similar strength when people moved near the wearable."),
  P("**Wearable — SOS and alerts.** A press is debounced for 40 ms and confirmed immediately by a short tone. Presses separated by less than 0.7 s are counted, and the pattern is sent when no further press follows: one press sends 'Needs assistance', two send 'URGENT – please come now' and three send 'EMERGENCY – immediate help needed', each confirmed by the same number of beeps. A stronger pattern while an SOS is open escalates it, and the server retires the weaker alert, so that one acknowledgement always clears the device. A 3 s hold dismisses a false alarm. Each status reply from the server states how many of the wearable's SOS alerts remain unacknowledged; when this reaches zero after an SOS was delivered, the wearable leaves SOS mode, plays a confirmation tone and returns its LED to the heartbeat blink, ready for a new alert. Alerts and status are queued and survive network outages; each delivered alert is logged with the time taken from its creation to its storage by the server."),
  P("**Wearable — heart rate.** The MAX30102 is read at 100 samples per second without discarding samples. After a finger is detected and the signal has settled for 1.5 s, beat intervals outside 40–180 bpm and intervals differing by more than 25 percent from the running median are rejected; the reported rate is 60 000 divided by the median of the last eight accepted intervals, shown once four are available. With no finger, no reading is reported instead of zero."),
  P("**Door node and stand-alone hub.** The reed switch is read with the internal pull-up; a debounced change produces an event, and a heartbeat every 30 s lets the dashboard distinguish a closed door from a failed node. In hub mode the same ESP32 also runs a WPA2 access point, a DNS server that answers every name with the hub's own address so that phones display the dashboard as a sign-in page on joining, and an HTTP server. The server implements the same interface as the computer backend field for field, so one dashboard page serves both modes; the page is compressed into the firmware at build time. It keeps up to 64 alerts in memory, enforces the passcode with a lock-out after five wrong attempts, and raises a 'device not reporting' alert after 30 s of silence. Replies are sent without blocking, and phones polling at the same moment share one summary, so that one slow phone cannot delay the wearable's reports (Section 4.10)."),
  P("**Computer backend and dashboard.** A FastAPI service stores reports in SQLite, reconstructs event time from device uptime so that delayed events do not overwrite newer state, merges a report repeated after a timed-out reply, assigns each alert a severity (critical, warning or information), and keeps critical and warning alerts until a caregiver acknowledges them. The browser interface is designed for phones, refreshes every second, is protected by a passcode, and follows the phone's light or dark setting. An unacknowledged SOS is shown with its message as the headline, sounds an alarm, vibrates the phone where supported and flashes the page title until it is acknowledged."),
  TODO("Insert flowcharts: wearable main loop, SOS pattern logic, door node and hub request handling, alert acknowledgement loop."),
  H2("3.7 Prototype Development"),
  P("The wearable and door node are built on perfboard as module carriers, as approved by the adviser on 24 September 2026. A single-sided, 69 × 66 mm printed circuit board layout without wire links (Revision C) was also produced and is included in Appendix C as design documentation. Beacons are unmodified ESP32 development boards on USB power. Enclosures for the wearable, the three beacons and the door node were modelled parametrically and printed in PETG, with openings for the USB connector, the status LED and the reed-switch cable."),
  TODO("Insert the bill of materials with unit costs and suppliers, and photographs of the assembled prototype."),
  H2("3.8 Design Constraints and Decision Matrix"),
  P("Table 3.3 compares candidate localization technologies. Weights reflect the needs of a home for the aged; scores (1–5) are the team's assessment informed by the literature in Chapter 2."),
  ...table("Table 3.3 Weighted decision matrix — localization technology", ["Criterion (weight)", "BLE beacons", "WiFi RSSI", "UWB", "Active RFID", "GPS"], [
    ["Indoor reliability (0.30)", "4", "3", "5", "3", "1"],
    ["Cost per zone (0.25)", "5", "4", "2", "3", "4"],
    ["Wearable power (0.20)", "4", "2", "3", "3", "2"],
    ["Integration with ESP32 / availability (0.15)", "5", "5", "2", "2", "3"],
    ["Positioning accuracy (0.10)", "3", "3", "5", "2", "1"],
    ["**Weighted score**", "**4.30**", "3.35", "3.40", "2.75", "2.25"],
  ], [3160, 1240, 1240, 1240, 1240, 1240]),
  P("BLE scores highest because it is the only option that is simultaneously reliable indoors, inexpensive per zone and built into the chosen microcontroller. UWB offers the best accuracy [9] but requires additional hardware in both the wearable and the infrastructure; zone-level accuracy is sufficient for this application."),
  ...table("Table 3.4 Design constraints and decisions", ["Constraint", "Trade-off", "Decision and justification"], [
    ["Localization technology", "Accuracy vs. cost and indoor reliability", "BLE beacons (Table 3.3)"],
    ["Beacon density", "Zone resolution vs. installation cost", "One beacon per zone; room-level classification by the strongest beacon"],
    ["Battery capacity", "Runtime vs. wearable size", "1000 mAh cell kept; runtime gap addressed by duty cycling and reported (Chapter 5)"],
    ["Wearable regulation", "Efficiency vs. part availability", "Boost to 5 V plus board regulator; low-dropout parts unavailable in time"],
    ["Caregiver interface", "Accessibility vs. development effort", "Web application usable on any phone browser; no native application"],
    ["Backend hosting", "Independence vs. record keeping", "Stand-alone hub in the door node (demonstrated): no computer or internet needed. Computer server on the facility network as the alternative, with a persistent history. Cloud hosting for remote viewing designed but not deployed (open decision)"],
    ["Network security and privacy", "Easy access vs. protection of health data", "WPA2 network, dashboard passcode with lock-out, data kept on site by default [13]"],
    ["Fabrication", "Robustness vs. schedule risk", "Perfboard module carrier (adviser-approved); PCB layout retained"],
    ["Societal constraint — SDG 3", "Safety of older persons vs. affordability", "Subscription-free, locally maintainable components [4]"],
  ], [2400, 2900, 4060]),
  H2("3.9 Engineering Principles and Modern Tools"),
  P("The design applies embedded systems design, RF propagation and link-budget analysis, sensor interfacing over I²C, power supply design, digital signal processing for pulse detection, and client–server web development including an embedded web server. Tools used include KiCad (schematic and layout), Blender (parametric enclosure models) with a Bambu Lab A1 printer, PlatformIO with the Arduino framework (firmware), Python with FastAPI and SQLite (backend), Python analysis scripts for the tests, and Git with a private GitHub repository for version control."),
  H2("3.10 Descoped Features"),
  P("Table 3.5 lists the features that were removed or deferred during the design, with the reason for each. They define the boundary of what the prototype claims to do."),
  ...table("Table 3.5 Features descoped from the prototype", ["Feature", "Reason", "Status"], [
    ["GPS tracking and outdoor geofencing", "Satellite positioning is unreliable indoors [3]; the application is indoor", "Removed (adviser decision)"],
    ["GSM/cellular alerts (SIM800L)", "2G network sunset risk in the Philippines; unnecessary on facility Wi-Fi", "Removed (adviser decision)"],
    ["Fall detection (accelerometer)", "Priority placed on localization and resident-initiated alerts", "Removed (adviser decision)"],
    ["Native mobile application", "A browser page works on every phone without installation", "Not developed"],
    ["Hand-etched printed circuit board", "Schedule risk; module-carrier perfboard approved on 24 September 2026", "Layout retained as documentation"],
    ["Low-dropout 3.3 V regulator", "No suitable part could be sourced in time", "Replaced by a boost converter (Section 3.5.1)"],
    ["MAX17043 fuel gauge", "Not delivered in time", "Voltage divider used"],
    ["Measured 24-hour battery runtime", "No cell or fuel gauge available for a full discharge test", "Calculated only (Section 4.12)"],
    ["Remote viewing outside the facility network", "Requires a cloud service; hosting is an open decision", "Designed and tested locally, not deployed"],
    ["Notifications to a locked phone", "Requires a push-notification service or application", "Further study"],
  ], [2900, 4100, 2360]),
];

// ---------- Chapter 4 ----------
const run1Points = [
  ["BW-near (first visit)", "113", "83 %", "0 %", "MR 17 %*"], ["BW-near (second visit)", "28", "93 %", "0 %", "MR 7 %"],
  ["BW-mid", "41", "0 %", "0 %", "MR 100 %"], ["BW-far", "17", "0 %", "0 %", "MR 100 %"],
  ["BW-boundary, from inside", "26", "54 %", "46 %", "—"], ["BW-boundary, from outside", "46", "0 %", "100 %", "—"],
  ["DH-near", "31", "100 %", "0 %", "—"], ["DH-mid", "18", "100 %", "0 %", "—"], ["DH-far", "19", "100 %", "0 %", "—"],
  ["DH-boundary, from inside", "24", "83 %", "17 %", "—"], ["DH-boundary, from outside", "12", "0 %", "100 %", "—"],
  ["MR-near", "22", "100 %", "0 %", "—"], ["MR-mid", "25", "16 %", "0 %", "BW 84 %"], ["MR-far", "28", "100 %", "0 %", "—"],
  ["MR-boundary, from inside", "25", "8 %", "84 %", "BW 8 %"], ["MR-boundary, from outside", "20", "0 %", "100 %", "—"],
];
const pend = (text) => tbd(text);
const ch4 = [
  H1("CHAPTER 4: TESTING, PRESENTATION AND INTERPRETATION OF DATA"),
  P("Each test is presented with its title, purpose, assumptions and constants, procedure, data and analysis. Raw captures are kept in the project repository (`data/`). Tests 4.4 to 4.9 were performed on 30 September 2026 on the firmware demonstrated at the defense."),
  H2("4.1 Test 1 — Received Signal Strength versus Distance"),
  P("**Purpose.** To determine the reference received power at 1 m and the path-loss exponent of the log-distance model, for conversion of received signal strength into an estimated distance."),
  P("**Assumptions and constants.** Single beacon at +9 dBm; beacon height 1.5 m; wearable height 0.75 m; clear line of sight; constant orientation."),
  P("**Procedure.** Distances of 1.0, 1.5, 2.0, 4.0 and 6.0 m were marked from the beacon to the wearable antenna. At each mark the wearable captured not fewer than 60 samples while stationary. Two runs with independent beacons are reported (run A: bedroom_wing, 492 samples; run B: dining_hall, 459 samples); a third was excluded because its distance labels did not describe the geometry of the additional beacon."),
  ...table("Table 4.1 Test 1 results", ["Distance", "n (run A)", "Mean (dBm)", "SD (dB)", "Residual A (dB)", "Residual B (dB)"], [
    ["1.0 m", "68", "−72.3", "2.41", "−0.3", "+0.1"], ["1.5 m", "100", "−71.1", "2.28", "+1.4", "+1.5"],
    ["2.0 m", "137", "−75.5", "2.14", "−2.6", "−3.2"], ["4.0 m", "92", "−70.4", "3.05", "+3.3", "+3.5"], ["6.0 m", "95", "−76.1", "2.47", "−1.9", "−1.8"],
  ], [1400, 1300, 1600, 1300, 1880, 1880]),
  ...table("Table 4.2 Fitted path-loss model", ["Run", "Fitted exponent n", "R²"], [["A — bedroom_wing", "0.28", "0.118"], ["B — dining_hall", "0.55", "0.302"]], [3800, 2800, 2760]),
  ...fig("f2_test1.png", 4.6, "Fig. 4.1 Mean RSSI against distance (run A)"),
  P("**Analysis.** Both fitted exponents fall far below 2.0, the free-space value and the physical lower bound, so neither is usable and neither was programmed into the firmware. With 68 to 137 samples per mark and standard deviations of 2.1 to 3.7 dB, the standard error of each mean is about 0.3 dB, yet the deviations from the fitted model reach 3.5 dB — more than ten times larger. The residual pattern is nearly identical for two independent beacons measured in separate runs (about 3 dB weak at 2.0 m and 3.4 dB strong at 4.0 m), which makes it a property of the measurement positions rather than of the transmitters. This is consistent with standing-wave fading: at 2.4 GHz the wavelength is about 12.5 cm, and interference between direct and reflected paths produces maxima and minima roughly 6 cm apart [7], [8]. Estimating distance from RSSI is therefore unreliable in this environment. Zone classification is unaffected, because it compares beacons against one another and does not use estimated distance."),
  H2("4.2 Beacon Transmit Power and Matching"),
  P("**Purpose.** To ensure all beacons transmit at the same effective power, since unequal power biases classification toward the stronger beacon."),
  P("**Procedure and data.** Each beacon was measured individually at 1 m with the other two powered down (21 September 2026), and the three beacons were re-checked with the new wearable on 24 September 2026, first side by side and then spaced 30 cm apart on a 1 m arc with two beacons exchanged."),
  ...table("Table 4.3 Beacon matching at 1 m (+9 dBm)", ["Beacon", "Individually, median (21 Sep)", "Side by side (24 Sep)", "Spaced, two swapped (24 Sep)"], [
    ["bedroom_wing", "−67.0 dBm", "−72.8 dBm", "−67.0 dBm"], ["dining_hall", "−65.0 dBm", "−62.2 dBm", "−71.1 dBm"],
    ["medicine_room", "−67.0 dBm", "−61.7 dBm", "−69.1 dBm"], ["**Spread**", "2 dB", "11 dB", "4 dB"],
  ], [2300, 2360, 2300, 2400]),
  P("**Analysis.** Measured individually, the beacons agree within 2 dB. Placed side by side they differed by 11 dB; when spaced and exchanged, the weak reading remained with the position rather than the beacon. The beacons are matched, and the spread was caused by placement — antenna coupling between adjacent beacons and position-dependent fading. Beacons must therefore be mounted apart, at equal height and orientation."),
  H2("4.3 Test 2 — Zone Classification Accuracy, Run 1 (Earlier Firmware)"),
  P("**Purpose.** To measure how reliably the wearable identifies the zone the resident is in, across the whole zone rather than only beside the beacon."),
  P("**Assumptions and constants.** Firmware commit f5b2e92: EMA α = 0.35, floor −88 dBm, hysteresis 4 dB, 3 confirmation checks, 300 ms classification period; beacons at +9 dBm. Only two rooms were available: the bedroom_wing and medicine_room beacons shared one room, and the dining_hall beacon was in the other."),
  P("**Procedure.** One continuous capture on 24 September 2026 (17:22–17:37). At each of 16 labelled points — near, mid, far and boundary points per zone, the boundary approached both from inside and from the neighbouring zone — the tester stood still while the true zone was recorded against the firmware's decision. The first 5 s after each label change were discarded."),
  ...table("Table 4.4 Run 1 confusion matrix (rows: true zone; columns: reported)", ["True \\ Reported", "bedroom_wing", "dining_hall", "medicine_room", "unknown", "Total"], [
    ["bedroom_wing", "134", "0", "79", "58", "271"], ["dining_hall", "0", "88", "0", "16", "104"], ["medicine_room", "23", "0", "56", "41", "120"],
  ], [2160, 1500, 1400, 1600, 1300, 1400]),
  ...table("Table 4.5 Run 1 per-zone metrics", ["Zone", "n", "Precision", "Recall", "F1"], [
    ["bedroom_wing", "271", "0.854", "0.494", "0.626"], ["dining_hall", "104", "1.000", "0.846", "0.917"], ["medicine_room", "120", "0.415", "0.467", "0.439"],
    ["**Overall accuracy**", "495", "", "**56.2 %**", ""], ["**Unresolved**", "", "", "**23.2 %**", ""],
  ], [2760, 1100, 1800, 1800, 1900]),
  ...table("Table 4.6 Run 1 per-point results", ["Point", "n", "Correct", "Unresolved", "Most common wrong answer"], run1Points, [3000, 900, 1400, 1600, 2460], 18),
  P("* The first 24 s at BW-near were recorded while the tester was still arriving (the bedroom_wing signal rose from −86 to −72 dBm); after arrival the point classified correctly throughout."),
  ...fig("f3_test2.png", 4.2, "Fig. 4.2 Recall by zone, Test 2 Run 1"),
  P("**Analysis.** Across the wall separating the two rooms there were no cross-room errors. Within the shared room, the medicine_room beacon read equal to or stronger than the bedroom_wing beacon at the bedroom's mid and far points, so those points were reported as medicine_room; only the points within about 1 m of each beacon classified reliably. All 115 unresolved samples occurred at boundary points, where every beacon was below the −88 dBm floor (−89 to −105 dBm). An a-priori prediction filed on 21 September 2026 (74 percent overall, 21 percent unresolved) matched the unresolved rate closely, while overall accuracy was lower because the prediction assumed each zone in its own room. These findings led to the classification changes of Section 3.6 (larger hysteresis, adaptive confirmation, shorter period and staleness time), evaluated in Run 3."),
  H2("4.4 Test 2 — Zone Classification Accuracy, Run 3 (Final Firmware)"),
  P("**Purpose.** To measure zone classification accuracy on the firmware and beacon placement used at the defense."),
  P(["**Assumptions and constants.** Room mode (strongest beacon), EMA α = 0.4, floor −88 dBm, hysteresis 5 dB, confirmation 0.4 s at a lead of 10 dB or more and 1.6 s otherwise, 200 ms classification period, 2.5 s staleness; active scanning at 99 percent duty; beacons at +9 dBm, 100 ms advertising interval, 1.2–1.5 m high. ", pend("Beacon layout, room dimensions and number of people present — from the 30 September floor plan")]),
  P("**Procedure.** As for Run 1: the same 15 labelled points, 60 s stationary at each, one continuous capture on 30 September 2026, the first 5 s after each label discarded."),
  TODO("Insert Table 4.7 (confusion matrix), Table 4.8 (per-zone precision, recall, F1, overall accuracy and unresolved rate) and Table 4.9 (per-point results) from test2_run3_results.txt, with the floor plan as Fig. 4.3."),
  TODO("Analysis: compare with Run 1 point by point; state the cause of every remaining error."),
  H2("4.5 Test 3 — Stability at Boundaries"),
  P("**Purpose.** To measure how often the reported zone changes while the wearer stands still — the flicker that the hysteresis and confirmation time are designed to suppress. **Procedure.** Derived from the stationary segments of Run 3; a zone change while the label is unchanged counts as a flicker."),
  P(["Run 1 (earlier firmware) produced 12 changes during stationary periods, 1.50 per minute. Run 3: ", pend("flicker count and rate per minute, by point type")]),
  H2("4.6 SOS Alert Delivery, Urgency Patterns and Dismissal"),
  P("**Purpose.** To measure the time from an SOS press to its storage by the hub, and to verify the three urgency patterns, escalation, acknowledgement and dismissal. **Assumptions.** The wearable measures the interval itself, from the moment the pattern is complete to the hub's confirmation that the alert is stored; the time for the dashboard to display it adds at most one polling interval (1 s)."),
  P("**Procedure.** Ten single presses, each acknowledged on a phone before the next; one two-press and one three-press pattern; two escalations (one press followed by three); five dismissals by a 3 s hold. The wearable's serial log was captured throughout and analysed with `test_day_report.py sos`."),
  TODO("Insert Table 4.10: delivery time (n, mean, median, minimum, maximum, 95th percentile) and the pattern, escalation, acknowledgement and dismissal outcomes."),
  H2("4.7 Heart Rate Compared with a Pulse Oximeter"),
  P(["**Purpose.** To quantify the deviation of the wearable's heart rate from a reference fingertip pulse oximeter. **Procedure.** The wearable's sensor and the oximeter were applied to fingers of opposite hands at rest; at each of ten readings the oximeter value was recorded, and the wearable's value was taken as the median of its reports over the following 10 s. Readings were taken from ", pend("number of"), " participants, including one after light exercise."]),
  TODO("Insert Table 4.11: paired readings, mean absolute error, bias, largest error and the proportion within ±5 bpm and ±10 bpm."),
  P("The heart rate is displayed for information only; the system raises no heart-rate alert, and the reading is not intended for diagnosis."),
  H2("4.8 Door Sensor Reliability and Latency"),
  P("**Purpose.** To verify that every opening of the restricted door produces an alert and that no false events occur. **Earlier data.** In the integration test of 29 September 2026 (facility-network mode), three open–close cycles each produced an alert, delivered from the door node to the server in 0.09–0.96 s. **Procedure.** Twenty open–close cycles with the door node operating as the hub; every reed change and every alert was logged."),
  TODO("Insert Table 4.12: cycles detected out of 20, alerts raised, false or double events, and the reed-switch operating gap."),
  H2("4.9 Operation during Network Loss"),
  P("**Purpose.** To verify that an SOS pressed while the network is unavailable is not lost. **Procedure.** Three trials: the hub was switched off, an SOS pressed, and the hub restored after 20 s. **Expected behaviour.** The wearable sounds its offline chirp, queues the alert, and delivers it when the network returns; the dashboard marks it 'delivered late' with its original time."),
  TODO("Insert Table 4.13: delay from press to delivery in each trial, and confirmation that each alert appeared with its original time."),
  H2("4.10 Dashboard and Hub Verification"),
  P("**Computer backend.** An automated self-test posts status, alert and door messages covering safe and restricted zones, unknown zone, device restart, out-of-order delivery, door state and heartbeat, the SOS lifecycle, alert persistence and acknowledgement. **Result:** 38 of 38 checks passed (24 September 2026, repeated on 30 September 2026 after the changes of Section 3.6). A repeated SOS report was confirmed to be merged with the original rather than stored twice."),
  P("**Stand-alone hub.** A network test from a computer joined to the hub's Wi-Fi covered the page, passcode, lock-out, the summary data contract, the clock, the door state, the redirection of Android and iOS connectivity checks to the dashboard, and simultaneous polling."),
  ...table("Table 4.14 Hub verification (29–30 September 2026)", ["Measurement", "Result"], [
    ["Network test checks passed", "17 of 17"],
    ["Dashboard page (15 KB compressed) load time", "78–97 ms"],
    ["Four clients polling every second for 10 s (104 requests)", "Median 32 ms, worst 60 ms"],
    ["Request with three idle connections open", "47 ms (no stall)"],
    ["Wearable connection held without a drop", "10 min, signal −34 to −52 dBm"],
    ["Phones: dashboard opened automatically on joining the network", "Android and iPhone"],
  ], [5800, 3560]),
  P("**Finding.** During the first phone test the hub occasionally took more than 4 s to answer the wearable, so its reports timed out and were resent. The first version of the hub's web server wrote each reply in a single blocking call; a phone in Wi-Fi power-save mode, receiving a 10 KB summary through the 5.7 KB network send buffer, held up every other client. Replies are now sent without blocking, and simultaneous polls share one summary. The same test exposed a second defect: a resent SOS became a second alert, which kept the wearable in SOS mode after the first was acknowledged. Repeated reports are now merged on both the hub and the computer backend."),
  H2("4.11 Power Supply Verification"),
  P("During the first power-up of the breadboard wearable, the ESP32 development board failed. The MT3608 output measured 17.64 V with no load — its factory setting — which exceeds the input rating of the development board's regulator. After the converter was adjusted to 5.03 V, a replacement board operated normally. The adjustment is now a required step before any board is connected, and it is included in the User's Manual as a service procedure."),
  H2("4.12 Tests Not Performed"),
  ...table("Table 4.15 Tests not performed, with reasons", ["Test", "Reason", "Recommendation"], [
    ["Battery endurance", "The prototype was powered from USB: no Li-Po cell was fitted and the fuel gauge was not delivered", "Measure the runtime from a full charge (Chapter 5)"],
    ["Low-battery alerting", "Requires a discharging cell", "Verify the 20 % and 10 % alerts with a bench supply in place of the cell"],
  ], [2400, 4300, 2660]),
];

// ---------- Chapter 5 ----------
const ch5 = [
  H1("CHAPTER 5: CONCLUSION AND RECOMMENDATIONS"),
  H2("5.1 Conclusions"),
  B(["**Zone detection (objective 1).** Room-level classification across walls produced no cross-room errors in Run 1. On the final firmware, Run 3 gave ", pend("overall accuracy and unresolved rate"), "."]),
  B("**Classification without distance.** Test 1 showed that distance estimation from RSSI is unreliable indoors because of standing-wave fading; comparing beacons with hysteresis and an adaptive confirmation time avoids this dependence."),
  B(["**Restricted areas and SOS (objectives 2 and 3).** Restricted-zone and door alerts are implemented end to end. The SOS button carries three urgency levels with escalation and dismissal, and an acknowledgement on the dashboard returns the wearable to normal operation. Measured SOS delivery time: ", pend("median and maximum"), "."]),
  B(["**Battery and heart rate (objective 4).** Battery level and heart rate are reported; the heart rate deviated from a pulse oximeter by ", pend("mean absolute error"), ". The battery alerts could not be verified without a cell."]),
  B("**Caregiver interface (objective 5).** The dashboard passed all automated checks and runs on any phone browser. The door node doubles as a stand-alone hub, so the system operates without a computer, router or internet connection; caregivers join by scanning a QR code."),
  B("**Network fallback (objective 6).** Events are queued during outages with a periodic local chirp and delivered with their original time when the connection returns."),
  B("**Battery endurance (objective 7).** The boost-plus-linear power chain, adopted because low-dropout regulators could not be sourced in time, does not reach the approved 24-hour target by calculation, and the runtime could not be measured."),
  H2("5.2 Recommendations"),
  B("Measure the battery runtime from a full charge, and replace the boost-plus-linear chain with a buck-boost converter or a regulator with dropout below 400 mV supplying 3.3 V directly; at a 35 mA load this is calculated to extend runtime to approximately 27 h on the same cell."),
  B("Deploy the cloud relay designed in this project, once the hosting decision is made, so that caregivers can monitor from outside the facility network; add push notifications so that alerts reach a locked phone."),
  B("Investigate doorway coverage: evaluate a lower detection floor against the resulting increase in wrong-zone reports, or add beacons at transitions."),
  B("Where several zones must share a room, study per-zone calibrated entry thresholds or multiple beacons per zone, and compare against fingerprinting approaches [8], [10]."),
  B("Validate the heart rate over a larger group against clinical equipment, and establish clinically informed alert thresholds with the facility."),
  B("Persist the hub's alert history to flash memory, and add battery backup to the door sensor nodes so that restricted doors remain monitored during power interruptions."),
  B("Evaluate a hybrid BLE/UWB design [9] for applications that need sub-metre accuracy, and evaluate the wearable's ergonomics with residents and caregivers."),
];

// ---------- References & appendices ----------
const refs = [
  "Philippine Statistics Authority, “Age and sex distribution in the Philippine population (2020 Census of Population and Housing),” Quezon City, Philippines. [Online]. Available: https://psa.gov.ph/content/age-and-sex-distribution-philippine-population-2020-census-population-and-housing",
  "G. Cipriani, C. Lucetti, A. Nuti, and S. Danti, “Wandering and dementia,” Psychogeriatrics, vol. 14, no. 2, pp. 135–142, 2014, doi: 10.1111/psyg.12044.",
  "F. Zafari, A. Gkelias, and K. K. Leung, “A survey of indoor localization systems and technologies,” IEEE Commun. Surveys Tuts., vol. 21, no. 3, pp. 2568–2599, 2019.",
  "United Nations General Assembly, “Transforming our world: The 2030 Agenda for Sustainable Development,” A/RES/70/1, 2015.",
  "Espressif Systems, “ESP32 series datasheet.” [Online]. Available: https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
  "Apple Inc., “Proximity beacon specification,” Release R1, 2015.",
  "T. S. Rappaport, Wireless Communications: Principles and Practice, 2nd ed. Upper Saddle River, NJ, USA: Prentice Hall, 2002.",
  "R. Faragher and R. Harle, “Location fingerprinting with Bluetooth Low Energy beacons,” IEEE J. Sel. Areas Commun., vol. 33, no. 11, pp. 2418–2428, Nov. 2015, doi: 10.1109/JSAC.2015.2430281.",
  "J. Kolakowski, V. Djaja-Josko, M. Kolakowski, and K. Broczek, “UWB/BLE tracking system for elderly people monitoring,” Sensors, vol. 20, no. 6, Art. no. 1574, 2020, doi: 10.3390/s20061574.",
  "C. Garcia and S. Inoue, “Relabeling for indoor localization using stationary beacons in nursing care facilities,” Sensors, vol. 24, no. 2, Art. no. 319, 2024, doi: 10.3390/s24020319.",
  "Secondary cells and batteries containing alkaline or other non-acid electrolytes — Safety requirements for portable sealed secondary cells, and for batteries made from them, for use in portable applications — Part 2: Lithium systems, IEC 62133-2:2017.",
  "Bluetooth SIG, “Bluetooth Core Specification.” [Online]. Available: https://www.bluetooth.com/specifications/specs/",
  "Republic of the Philippines, “Data Privacy Act of 2012,” Republic Act No. 10173, Aug. 15, 2012.",
];
const back = [
  H1("REFERENCES"),
  ...refs.map((r, i) => new Paragraph({ children: [t(`[${i + 1}]  `), t(r)], spacing: { after: 100 }, indent: { left: 540, hanging: 540 } })),
  TODO("Check each reference against its source before submission; add datasheets for the MAX30102, TP4056, MT3608 and 2N2222 if cited in Chapter 3."),
  H1("APPENDICES"),
  P("Appendix A — User's Manual (separate document)."),
  P("Appendix B — Wearable schematic (KiCad, ANSI/IEEE symbols) and door sensor node schematic."),
  P("Appendix C — Revision C printed circuit board layout and etching artwork (design documentation)."),
  P("Appendix D — Bill of materials with costs."),
  P("Appendix E — Test data: raw captures and analysis outputs (repository `data/`)."),
  P("Appendix F — Source code: wearable, beacon and door node firmware; dashboard (private GitHub repository Jeju2004/SESEM)."),
  P("Appendix G — Photographs of the prototype and test setups."),
  P("Appendix H — Signed forms: progress reports, Request for Billing."),
  P("Appendix I — Panel access card: QR codes for the hub's Wi-Fi network and the dashboard address."),
  P("Appendix J — Test-day procedure of 30 September 2026 and the analysis scripts."),
];

// ---------- document ----------
const doc = new Document({
  creator: "Chester John B. Cirio; Pathrish Anne R. Cruz", title: "TroDes — IEEE-format paper, Revision 4 draft",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT }, paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER, outlineLevel: 0, keepNext: true, keepLines: true } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, font: FONT }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1, keepNext: true, keepLines: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, italics: true, font: FONT }, paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2, keepNext: true, keepLines: true } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ...Array.from({ length: 6 }, (_, i) => ({ reference: `steps${i}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })),
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })] })] }) },
    children: [...front, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...back],
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length); });
