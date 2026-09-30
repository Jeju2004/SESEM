// Generates the TroDes User's Manual draft (.docx). Draft v0.3, 1 Oct 2026.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak, Header, Footer, PageNumber,
  TableOfContents,
} = require("docx");

const OUT = process.argv[2];
const CONTENT_W = 9360; // Letter 8.5" - 2 x 1" margins, in DXA
const FONT = "Arial";

// ---------- helpers ----------
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
const tbd = (text) => new TextRun({ text: `[${text}]`, font: FONT, highlight: "yellow", bold: true });

function runs(parts) {
  // parts: string | TextRun | array of those; "**x**" → bold, "`x`" → monospace
  const list = Array.isArray(parts) ? parts : [parts];
  const out = [];
  for (const p of list) {
    if (typeof p !== "string") { out.push(p); continue; }
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(p))) {
      if (m.index > last) out.push(t(p.slice(last, m.index)));
      const s = m[0];
      if (s.startsWith("**")) out.push(t(s.slice(2, -2), { bold: true }));
      else out.push(new TextRun({ text: s.slice(1, -1), font: "Consolas", size: 20 }));
      last = m.index + s.length;
    }
    if (last < p.length) out.push(t(p.slice(last)));
  }
  return out;
}
const P = (parts, o = {}) => new Paragraph({ children: runs(parts), spacing: { after: 120 }, ...o });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text)], pageBreakBefore: true });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
const B = (parts, level = 0) => new Paragraph({ children: runs(parts), numbering: { reference: "bullets", level }, spacing: { after: 60 } });
let curList = 0;
const restart = () => { curList++; return []; };
const N = (parts) => new Paragraph({ children: runs(parts), numbering: { reference: `steps${curList}`, level: 0 }, spacing: { after: 60 } });
const CODE = (line) => new Paragraph({
  children: [new TextRun({ text: line, font: "Consolas", size: 18 })],
  shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" }, spacing: { after: 0 },
  indent: { left: 240 },
});
const NOTE = (label, parts, fill = "FFF4E5") => new Paragraph({
  children: [t(label + "  ", { bold: true }), ...runs(parts)],
  shading: { type: ShadingType.CLEAR, color: "auto", fill },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: fill === "FDE7E7" ? "C0392B" : "E67E22", space: 6 } },
  spacing: { before: 120, after: 160 }, indent: { left: 120, right: 120 },
});
const WARN = (parts) => NOTE("WARNING", parts, "FDE7E7");
const CAUTION = (parts) => NOTE("CAUTION", parts, "FFF4E5");
const FIG = (caption) => new Paragraph({
  children: [tbd(`Insert photo/figure: ${caption}`)], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 },
});

const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(header, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (content, w, isHead) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: "D9E2F3" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: isHead ? [t(content, { bold: true })] : runs(content) })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) })),
    ],
  });
}
const SP = () => new Paragraph({ children: [], spacing: { after: 120 } });

// ---------- content ----------
const path = require("path");
const { ImageRun } = require("docx");
const FIGDIR = path.join(__dirname, "figures");
// A real figure (PNG) with its caption.
function IMG(file, widthIn, caption) {
  const buf = fs.readFileSync(path.join(FIGDIR, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const wPx = Math.round(widthIn * 96), hPx = Math.round(wPx * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, keepNext: true, children: [new ImageRun({ type: "png", data: buf, transformation: { width: wPx, height: hPx } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [t(caption, { italics: true, size: 18, color: "595959" })] }),
  ];
}

const title = [
  new Paragraph({ children: [], spacing: { before: 2400 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("TroDes", { bold: true, size: 72, color: "1F3864" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [t("Smart Elderly Safety and Emergency Monitoring System with Geofencing", { size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("An Indoor BLE-Based Localization and Safety Monitoring System for a Home for the Aged", { italics: true, size: 24 })] }),
  new Paragraph({ children: [], spacing: { before: 720 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("USER'S MANUAL", { bold: true, size: 44 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [t("Draft v0.3 — 1 October 2026", { size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Prepared by: Chester John B. Cirio and Pathrish Anne R. Cruz — Section C1")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Adviser: Engr. Glenn V. Magwili")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("BS Electronics and Communications Engineering — Electronics Design")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Mapúa University")] }),
];

const toc = [
  new Paragraph({ children: [t("Contents", { bold: true, size: 32, color: "1F3864" })], pageBreakBefore: true, spacing: { after: 200 } }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  P([t("To refresh page numbers after editing, right-click the table and choose ", { italics: true }), t("Update Field", { italics: true, bold: true }), t(".", { italics: true })]),
];

const s1 = [
  H1("1. Introduction"),
  H2("1.1 Purpose of this manual"),
  P("This manual explains how to install, operate and maintain TroDes, an indoor monitoring system for residents of a home for the aged. It is written for two groups of readers:"),
  B("**Caregivers** — who read the dashboard on their phones, respond to alerts and look after the wearable device day to day (Sections 2, 4, 6, 7 and 8)."),
  B("**Technical staff** — who install the beacons and the door sensor node, start the system and configure the devices (Sections 5 and 10)."),
  H2("1.2 What the system does"),
  P("TroDes tells caregivers, in real time, which area of the facility each resident is in and whether the resident needs help. It provides:"),
  B("**Zone detection** — the resident's wearable listens for small radio beacons placed in each zone and determines which zone the resident is in."),
  B("**Restricted-area alerts** — an immediate alert when a resident enters a restricted zone such as the medicine room, or when a restricted door is opened."),
  B("**SOS alerts in three levels** — the resident presses the wearable's button once, twice or three times to say how urgent the call is. The caregiver's phone shows the message and sounds an alarm until someone acknowledges it."),
  B("**Battery monitoring** — the wearable's battery level is shown on the dashboard, with low- and critical-battery alerts."),
  B("**Heart rate display** — the wearable reports a heart-rate reading for display. It is not a medical measurement and raises no alert of its own (see Section 2)."),
  H2("1.3 How it works"),
  P("TroDes is built around **Bluetooth Low Energy (BLE)**. Each zone has one fixed beacon that continuously broadcasts a short BLE signal identifying that zone. The wearable measures the strength of every beacon signal it receives and selects the zone whose beacon is strongest; the zone is decided on the wearable itself, so localization never depends on the network. The wearable then reports the zone, battery level, heart rate and any alerts over Wi-Fi."),
  P("The **door sensor node** on the restricted door also serves as the system's **hub**. It creates its own Wi-Fi network named **SESEMSG**, receives the wearable's reports and shows the caregiver dashboard to any phone that joins the network. No computer, router or internet connection is needed. Where a facility prefers, the same dashboard can instead run on a computer connected to the building's Wi-Fi (Section 5.4)."),
  P("The system therefore works **with or without an internet connection**. Everything described in this manual runs on the facility's own equipment. An internet connection is needed only for optional remote viewing from outside the facility, which is not part of the prototype."),
  ...IMG("f1_arch_v2.png", 6.5, "Figure 1. System overview: (a) the door node as the hub, as used in the demonstration; (b) the alternative with a computer on the facility network"),
];

const s2 = [
  H1("2. Safety Information"),
  P("Read this section before using or servicing any part of the system."),
  WARN("The wearable contains a **lithium-polymer (Li-Po) battery**. Do not puncture, crush, bend, heat or immerse it. If the battery swells, becomes hot, smells or leaks, switch the device off, disconnect it, and move it away from flammable materials. Do not use a swollen battery."),
  WARN("**Charge only with the device's USB-C charging port and a standard 5 V USB charger.** Do not leave the device charging unattended overnight in a resident's room. Do not charge a device that is damaged."),
  WARN("**TroDes is not a medical device.** The heart-rate reading has not been validated against clinical equipment and must not be used for diagnosis or treatment decisions. It is displayed for information only."),
  CAUTION("TroDes supports caregivers; it does not replace supervision. Zone detection depends on radio signals and can be temporarily wrong or unavailable — for example near doorways, or when the Wi-Fi network is down. Always verify an alert in person."),
  CAUTION("The alarm sounds only on phones that have the dashboard open. A caregiver on duty must keep the dashboard open on their phone, with the volume up."),
  CAUTION("**Technical staff only:** the wearable's internal boost converter must be adjusted to **5.0 V** with a multimeter before the microcontroller board is connected. A new converter can output more than 17 V from the factory, which destroys the board. See Section 10.3."),
  CAUTION("Keep the wearable, beacons and door node dry. They are not water-resistant. Keep the door node powered at all times: it is also the hub, and the dashboard stops when it is off."),
];

const s3 = [
  H1("3. System Components"),
  table(["Component", "Qty (demo)", "Where it goes", "Power"], [
    ["**Wearable device**", "1 per resident", "Worn by the resident", "Rechargeable 3.7 V Li-Po battery"],
    ["**Zone beacon**", "3 (one per zone)", "Fixed in each zone — bedroom wing, dining hall, medicine room", "5 V USB adapter"],
    ["**Door sensor node (hub)**", "1 (medicine room door)", "On the wall beside the restricted door; also creates the SESEMSG network and serves the dashboard", "5 V USB adapter"],
    ["**Caregiver phones**", "Up to 7 at a time", "Anywhere within range of the SESEMSG network", "—"],
    ["Dashboard computer (optional)", "1", "Only for the facility-network option (Section 5.4)", "Mains"],
    ["**Access card**", "1 per caregiver station", "QR codes to join the network and open the dashboard", "—"],
  ], [2300, 1500, 3460, 2100]),
  SP(),
  H2("3.1 Zones in the demonstration system"),
  table(["Zone", "Zone ID", "Type", "Door sensor"], [
    ["Bedroom Wing", "1", "Safe", "No"],
    ["Dining Hall", "2", "Safe", "No"],
    ["Medicine Room", "11", "**Restricted**", "Yes"],
  ], [3000, 1600, 2400, 2360]),
  SP(),
  P("Additional zones (for example a common area, the main exit or a stairwell) can be added by installing a beacon for each and registering it in the system configuration (Section 10.2)."),
];

const s4 = [
  H1("4. The Wearable Device"),
  FIG("Wearable device — front view with labelled SOS button, status LED, power switch; back view with charging port"),
  H2("4.1 Parts of the wearable"),
  table(["Part", "What it does"], [
    ["**SOS button**", "1, 2 or 3 quick presses: send an SOS of increasing urgency (Section 6.3). Press and hold for 3 seconds: cancel a false alarm. The wearable ticks softly once a second while the button is held; let go after the long, low tone."],
    ["**Power switch**", "Slide to ON (battery) or OFF."],
    ["**Buzzer**", "Sounds tones to confirm actions and to warn the resident (Section 4.3)."],
    ["**Status LED**", "A short blink every 2 seconds shows the device is running. It stays lit while an SOS is waiting for a caregiver, and lights with every tone."],
    ["**USB-C charging port**", "Charges the battery (Section 6.2)."],
    ["**Heart-rate sensor**", "Reads the pulse from a fingertip or skin in steady contact."],
  ], [2600, 6760]),
  SP(),
  H2("4.2 Wearing the device"),
  P(["The device is worn ", tbd("wearing position — wrist strap / waist clip / lanyard — pending adviser decision"), ". Keep it on the body and uncovered by metal objects. For a heart-rate reading, the sensor must touch the skin ", tbd("confirm sensor placement for the final build"), "."]),
  H2("4.3 Tones and what they mean"),
  table(["Tone", "Meaning", "What to do"], [
    ["Two short beeps", "Device has switched on and started", "Nothing — normal start-up"],
    ["One very short tick", "The SOS button press was registered", "Press again within 0.7 s to raise the urgency"],
    ["One, two or three beeps", "An SOS was sent: 1 = needs assistance, 2 = urgent, 3 = emergency", "A caregiver will respond"],
    ["Soft low tick, once a second", "The SOS button is being held", "Keep holding until the long, low tone to cancel"],
    ["One long, low tone", "The SOS was acknowledged by a caregiver, or cancelled by holding the button 3 s", "Nothing — the device is ready for a new SOS"],
    ["Four quick high beeps", "Resident has entered a **restricted zone**", "Caregiver: check on the resident"],
    ["Two medium beeps", "Battery low (20 %) or critical (10 %)", "Charge the device soon"],
    ["Two short low chirps, repeated every minute", "Device cannot reach the hub or the dashboard", "See Section 7"],
  ], [2500, 3600, 3260]),
];

const s5 = [
  H1("5. Installation and Setup (Technical Staff)"),
  P("Install the parts in this order: beacons, door sensor node (hub), then the wearable. Then give caregivers the access card."),
  H2("5.1 Placing the zone beacons"), ...restart(),
  P("Each beacon is labelled with its zone name. Install one beacon per zone."),
  N("Place the beacon **in the centre of its zone**, not in a corner. In a building, the best separation is achieved when each zone is a separate room with walls between zones."),
  N("Mount every beacon at the **same height, 1.2 to 1.5 m**, with the antenna end (marked UP on the enclosure) pointing **upward** and at least 10 cm from metal objects and other electronics."),
  N("Keep beacons **apart from one another** — never side by side. Tests showed that crowded beacons can differ in signal strength by 11 dB, against 4 dB when spaced apart."),
  N("Connect each beacon to a 5 V USB adapter and route the cable downward, away from the antenna end."),
  N("If a power bank is used instead of an adapter, confirm that it does not switch itself off: leave the beacon running on it for 30 minutes and check that the zone is still detected."),
  CAUTION("If two or more zones must share one room (for example in a demonstration), zones are only reliably distinguished near each beacon. Place the beacons as far apart as the room allows."),
  FIG("Beacon in its enclosure, mounted at 1.2–1.5 m with the antenna end up"),
  H2("5.2 Installing the door sensor node (hub)"), ...restart(),
  N("Fix the node's enclosure on the wall beside the restricted door, within reach of a power outlet, where its Wi-Fi reaches the areas caregivers work in."),
  N("Fix the **reed switch** on the door frame and the **magnet** on the door, directly opposite each other and at the same height, so that they are within the switch's operating gap when the door is closed."),
  N("Connect the node to its 5 V USB adapter. Within a few seconds the Wi-Fi network **SESEMSG** appears."),
  N("Open and close the door and confirm on a phone (Section 5.3) that the door tile changes within a few seconds."),
  P(["Operating gap of the supplied reed switch: ", tbd("measured on 30 September 2026"), "."]),
  FIG("Door sensor node — enclosure, reed switch on frame, magnet on door"),
  H2("5.3 Opening the dashboard on a phone"), ...restart(),
  P("Each caregiver station has an **access card** with two QR codes."),
  N("Scan **QR code 1** with the phone's camera and tap **Join**. The phone joins the SESEMSG network (password printed on the card)."),
  N("The dashboard normally opens by itself as a \"sign in to network\" page. If it does not, scan **QR code 2**, or open a browser at `http://192.168.4.1`."),
  N("Enter the six-digit **passcode**. After five wrong attempts the passcode is locked for 60 seconds."),
  N("Tap anywhere on the page once, so that the phone allows the alarm sound. Keep the page open and the volume up while on duty."),
  NOTE("TIP", "If the page does not open on an Android phone, turn off mobile data: some phones send pages over mobile data when the Wi-Fi network has no internet."),
  P("Up to seven phones can use the dashboard at the same time, in addition to the wearable."),
  H2("5.4 Alternative: dashboard on a computer (facility network)"), ...restart(),
  P("Use this option when the facility wants a permanent history of events on a computer. The wearable uses it automatically whenever the SESEMSG network is not present."),
  N("Program the door node with its normal (non-hub) firmware, and set the facility Wi-Fi name and the computer's address in both devices' configuration files (Section 5.5)."),
  N("Connect the dashboard computer to the facility Wi-Fi. Set it never to sleep while the system is in use."),
  N("Open PowerShell and start the dashboard server, then leave the window open:"),
  CODE("cd C:\\Users\\Chester\\Desktop\\Vaya\\SESEM\\dashboard"),
  CODE("$env:TRODES_PASSCODE = \"<six-digit passcode>\""),
  CODE("& \"C:\\TroDesData\\dashboard\\.venv\\Scripts\\python.exe\" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"),
  SP(),
  N("On a phone on the same network, open `http://<computer address>:8000` (find the address with `ipconfig`, IPv4 Address). If the page does not load, allow Python through Windows Firewall when prompted."),
  H2("5.5 Device configuration"),
  P(["Network names, passwords, the passcode and the dashboard address are stored in a configuration file on each device (`include/secrets.h`), which is loaded when the device is programmed and is never shared publicly. See the Board Programming Guide in the project repository. After programming, the dashboard shows the resident within about 10 seconds of switching the wearable on."]),
  H2("5.6 First-use checklist"),
  table(["Check", "Expected result"], [
    ["Switch the wearable on", "Two short beeps; the resident appears on the dashboard within about 10 s"],
    ["Stand beside each beacon for 10 seconds", "Dashboard shows that zone"],
    ["Walk up to the medicine room beacon", "Four quick beeps; red restricted-zone alert"],
    ["Open the medicine room door", "Door alert on the dashboard"],
    ["Press the SOS button once", "Tick, then one beep; \"SOS: Needs assistance\" and the alarm on the phones"],
    ["Tap Acknowledge on a phone", "Alarm stops; the wearable plays a long low tone and its LED returns to the short blink"],
    ["Press three times quickly", "Three beeps; \"SOS: EMERGENCY - immediate help needed\""],
    ["Hold the SOS button for 3 seconds", "Long low tone; SOS cancelled on the dashboard"],
  ], [4200, 5160]),
];

const s6 = [
  H1("6. Daily Operation (Caregivers)"),
  H2("6.1 Switching the wearable on and off"),
  P("Slide the power switch to ON. Two short beeps confirm that the device has started. Slide the switch to OFF when the device is not being worn, or before charging if preferred."),
  H2("6.2 Charging the battery"), ...restart(),
  N("Connect a standard 5 V USB-C charger to the wearable's charging port."),
  N("Watch the charger's two lights, next to the charging port: **red = charging**, **blue = fully charged**."),
  N("Disconnect the charger when charging is complete."),
  CAUTION("If the **red light blinks while the blue light is on**, the charger cannot see the battery: the battery is disconnected or its wires are loose. Do not use the device on battery until technical staff have checked the battery connection (Section 8)."),
  P(["Battery life per charge: ", tbd("not yet measured — see Section 10.1"), ". Charge the device every day, and whenever the dashboard shows a low-battery alert."]),
  H2("6.3 Using the SOS button (resident)"),
  table(["Press", "Message shown to caregivers", "Confirmation on the wearable"], [
    ["**Once**", "SOS: Needs assistance", "Tick, then one beep"],
    ["**Twice quickly**", "SOS: URGENT - please come now", "Two beeps"],
    ["**Three times quickly**", "SOS: EMERGENCY - immediate help needed", "Three beeps"],
    ["**Hold 3 seconds**", "Green notice: SOS cancelled by the resident (false alarm); the red SOS clears", "A soft tick each second, then one long, low tone"],
  ], [2200, 4300, 2860]),
  SP(),
  B("Presses count as one pattern when they are less than 0.7 s apart. The message is sent 0.7 s after the last press."),
  B("To cancel, keep holding until the long, low tone (3 s). A hold released earlier counts as a press and sends an SOS."),
  B("If no one has come, the resident can press again with **more** presses; the alert is raised to the higher level. Pressing the same or fewer times repeats the confirmation only."),
  B("While an SOS is waiting, the wearable's LED stays lit. When a caregiver acknowledges it, the wearable plays a long low tone and is ready for a new SOS."),
  H2("6.4 Reading the dashboard"),
  ...IMG("f4_dashboard_phone.png", 2.6, "Figure 2. The dashboard on a phone, with an urgent SOS waiting for acknowledgement (test data)"),
  P("The page updates every second. It follows the phone's light or dark setting; the sun/moon button switches it for the moment. Type your name at the top so that your acknowledgements are recorded under it. The dashboard has three tabs:"),
  table(["Tab / area", "What it shows"], [
    ["**Alert banner (top)**", "The most urgent unacknowledged alert, with its message, time and place, and the Acknowledge button. The arrow hides it for the moment; a new alert brings it back."],
    ["**Home — resident tile**", "The resident's current zone (red when restricted or during an SOS; grey when not reporting), time in the zone and battery."],
    ["**Home — door and heart rate**", "The restricted door (Closed, OPEN or Offline) and the heart rate, or a dash when there is no reading."],
    ["**Home — floor plan and zones**", "The zones with the resident's position, signal strength and time since the last report."],
    ["**Alerts**", "Every alert waiting for acknowledgement, and the state of each door node."],
    ["**Activity**", "Recent zone changes, door events and alerts, with who acknowledged each one and when."],
  ], [2600, 6760]),
  SP(),
  H2("6.5 Status indications"),
  table(["Indication", "Meaning"], [
    ["Zone tile with a **SAFE** label", "Resident is in a safe zone"],
    ["Zone tile in **red**, **RESTRICTED**", "Resident is in a restricted zone"],
    ["Zone unknown", "No beacon is close enough to decide — often near a doorway or between zones"],
    ["Battery shown as \"—\"", "No battery reading (for example, the device is powered from USB)"],
    ["Heart rate shown as \"—\"", "No reading: place a finger on the sensor and keep still"],
    ["**NOT REPORTING**, greyed out", "No report from the wearable for 30 seconds — treat as a safety event and check the resident"],
    ["\"No connection\" at the top", "The phone has lost the hub; the data shown is the last received"],
  ], [3400, 5960]),
  SP(),
  H2("6.6 Alerts and how to respond"),
  table(["Alert", "Severity", "Response"], [
    ["SOS: EMERGENCY / URGENT / Needs assistance", "**Critical**", "Go to the resident immediately; the message says how urgent"],
    ["Entered restricted zone", "**Critical**", "Go to the resident and guide them out"],
    ["Restricted door opened", "**Critical**", "Check the door and who opened it"],
    ["Battery critical (10 %)", "**Critical**", "Charge or replace the wearable now"],
    ["Battery low (20 %)", "Warning", "Charge soon"],
    ["Location unknown - no beacon in range", "Warning", "Locate the resident. Raised once when no beacon has been heard for about 8 seconds; clears by itself when the resident is detected in a zone again"],
    ["Device not reporting", "Warning", "Check the resident and the wearable. One alert per outage; clears by itself when the wearable reports again"],
    ["SOS dismissed, zone change, door closed", "Information", "No action needed"],
  ], [3600, 1600, 4160]),
  SP(),
  P("Critical and warning alerts stay on the dashboard until a caregiver acknowledges them. **To acknowledge**, tap **Acknowledge** after responding; the dashboard records your name and the time. For an SOS, the acknowledgement also stops the alarm on every phone and returns the wearable to normal. \"All\" acknowledges every waiting alert at once."),
];

const s7 = [
  H1("7. When the Network Is Unavailable"),
  P("If the wearable cannot reach the hub (or the dashboard computer):"),
  B("The wearable keeps working. It continues to detect zones and to respond to the SOS button, and it **stores the events** it could not send."),
  B("It sounds **two short low chirps every minute** so that the loss of connection is not silent."),
  B("On the dashboard, the resident greys out as NOT REPORTING after 30 seconds, and a \"Device not reporting\" alert is raised."),
  B("When the connection returns, the stored events are delivered with their original times and marked \"delivered late\"."),
  B("If the hub restarts (for example after a power cut), the wearable rejoins it by itself within about 10 seconds. Phones rejoin the SESEMSG network automatically; reopen the dashboard if needed."),
  P("If a door node loses power, the dashboard marks that door Offline after 90 seconds, rather than showing its last state. When the door node is the hub, a power cut also stops the dashboard: restore its power first."),
  CAUTION("During an outage, alerts reach caregivers only through the wearable's own buzzer. Restore the power or network as soon as possible and check residents in person. The hub keeps its alert history in memory, so a restart clears the history shown on the dashboard."),
];

const s8 = [
  H1("8. Troubleshooting"),
  table(["Problem", "Likely cause", "What to do"], [
    ["Wearable does not beep when switched on", "Battery flat, or charger protection has tripped", "Charge for at least 30 minutes, then switch on again"],
    ["Resident shows NOT REPORTING", "Wearable off, out of range, or battery flat", "Check the resident; check the wearable is on and charged"],
    ["Zone shows unknown", "No beacon heard for about 8 seconds, e.g. a hallway or room without a beacon", "Normal in spaces without a beacon; if it appears in the middle of a zone, check that zone's beacon is powered"],
    ["Wrong zone shown", "Beacon moved, blocked or too close to another beacon", "Check beacon placement (Section 5.1)"],
    ["Chirps every minute", "Wearable cannot reach the hub or the computer", "Check that the door node (hub) is powered"],
    ["Dashboard does not open after joining SESEMSG", "Phone is using mobile data, or the sign-in page was closed", "Turn off mobile data; scan QR code 2 or open http://192.168.4.1"],
    ["No alarm sound on the phone", "Page not tapped since it was opened, or volume low", "Tap the page once; turn the volume up; keep the page open"],
    ["\"Too many tries\" on the lock screen", "Five wrong passcodes", "Wait 60 seconds, then enter the correct passcode"],
    ["Heart rate shows \"—\"", "Finger not on the sensor, or moving", "Place a finger lightly on the sensor and keep still for 10 seconds"],
    ["Door shows Offline", "Door node unpowered", "Check its USB adapter"],
    ["Door state wrong", "Magnet and reed switch misaligned", "Realign so they face each other within the operating gap"],
    ["Charger: red blinking while blue is on", "Battery not connected to the charger", "Technical staff: check the battery wires at the charger's B+ and B− terminals"],
    ["Wearable works on USB but not on battery", "Weak connection between the charger and the board, or a faulty boost converter", "Technical staff: measure along the power path (Section 10.3); every point should read the battery voltage, and the boost output 5.0 V"],
  ], [2700, 3100, 3560]),
];

const s9 = [
  H1("9. Care and Maintenance"),
  B("Charge the wearable daily. If it will be stored for a long time, store it at about half charge and recharge it every three months."),
  B("Wipe the devices with a dry or slightly damp cloth. Do not use solvents or immerse them."),
  B("Check each month that every beacon and the door node are powered, that door magnets are aligned, and that each zone is detected (repeat the checklist in Section 5.6)."),
  B("Change the dashboard passcode and the network password if an access card is lost."),
  B("Do not open the wearable. Battery replacement and internal adjustment are for technical staff only."),
  B("Dispose of Li-Po batteries and electronic parts at an appropriate electronic-waste collection point, not with household waste."),
];

const s10 = [
  H1("10. Technical Information"),
  H2("10.1 Specifications"),
  table(["Item", "Specification"], [
    ["Microcontroller (all devices)", "ESP32-WROOM-32 development board"],
    ["Localization method", "BLE iBeacon received signal strength (RSSI), one beacon per zone; the strongest beacon wins"],
    ["Zone decision", "Every 200 ms; a new zone must lead by 5 dB — for 0.4 s when it leads by 10 dB or more, otherwise for 1.6 s. Zone unknown after about 8.5 s with no beacon heard"],
    ["Beacons", "+9 dBm, advertising every 100 ms (all beacons identical)"],
    ["Status report", "Every 5 s; alerts sent at once"],
    ["SOS button", "1–3 presses within 0.7 s gaps choose the urgency; hold 3 s = cancel (a tick each second while held)"],
    ["Hub network", "Wi-Fi \"SESEMSG\", WPA2, dashboard at 192.168.4.1; up to 8 devices (the wearable and 7 phones)"],
    ["Dashboard", "Web page on any phone browser, refreshed every second, passcode-protected; served by the hub, or by a FastAPI/SQLite server on a computer"],
    ["Wearable battery", "3.7 V, 1000 mAh lithium-polymer; alerts at 20 % and 10 %"],
    ["Charging", "USB-C, TP4056 charger with DW01 protection"],
    ["Wearable power supply", "Battery → MT3608 boost converter (5.0 V) → board regulator (3.3 V)"],
    ["Battery measurement", "Voltage divider on GPIO 34 (MAX17043 fuel gauge optional)"],
    ["Heart-rate sensor", "MAX30102 optical sensor at 100 samples/s; median of 8 beats (display only)"],
    ["Door sensor", "Magnetic reed switch on GPIO 18; heartbeat every 30 s; marked offline after 90 s"],
    ["Wearable battery life", [t("Target 24 h; calculated about 10 h at the present load. Measured: "), tbd("not yet measured")]],
  ], [3300, 6060]),
  SP(),
  H2("10.2 Measured localization performance"),
  P("From Test 2, Run 1 (24 September 2026, earlier firmware):"),
  B("Between zones in **separate rooms**: **no cross-room errors** — the system never reported the wrong room."),
  B("Between zones **sharing one room**: reliable within about **1 m** of each beacon."),
  B("Unresolved readings occurred at doorways, where every beacon signal was weakest; the system reports \"unknown\" there rather than a wrong zone."),
  P(["From Test 2, Run 3 (30 September 2026, final firmware): ", tbd("overall accuracy, unresolved rate and flicker rate")]),
  H2("10.3 Service note — boost converter adjustment"), ...restart(),
  N("Disconnect the microcontroller board from the circuit."),
  N("Switch the device on and measure the MT3608 output (OUT+ to OUT−) with a multimeter on DC volts."),
  N("Turn the converter's adjustment screw (usually counter-clockwise to lower) until the output reads **5.0 V** (4.9–5.1 V)."),
  N("Switch off and on again and confirm the reading holds. Mark the screw so that it is not disturbed."),
  N("Only then reconnect the microcontroller board, and confirm 3.3 V on its 3V3 pin."),
  H2("10.4 Glossary"),
  table(["Term", "Meaning"], [
    ["BLE", "Bluetooth Low Energy — the low-power radio used by the beacons and the wearable"],
    ["Beacon", "A fixed device that broadcasts an identifying radio signal for one zone"],
    ["Hub", "The door sensor node acting as the system's server: it creates the SESEMSG network and shows the dashboard"],
    ["Sign-in page (captive portal)", "The page a phone opens by itself after joining a network; here it is the dashboard"],
    ["QR code", "A square barcode the phone camera reads to join the network or open the dashboard"],
    ["RSSI", "Received Signal Strength Indicator, in dBm; values closer to zero are stronger"],
    ["Zone", "An area of the facility — safe or restricted — identified by its beacon"],
    ["Restricted zone", "An area residents should not enter unaccompanied, such as the medicine room"],
    ["Reed switch", "A magnetically operated switch that detects whether a door is closed"],
    ["Acknowledge", "A caregiver's confirmation that an alert is being handled; recorded with name and time"],
  ], [2400, 6960]),
];

// ---------- document ----------
const doc = new Document({
  creator: "TroDes team", title: "TroDes User's Manual — Draft v0.3",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: "1F3864" }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0, keepNext: true, keepLines: true } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "2E5496" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1, keepNext: true, keepLines: true } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } } ] },
      ...Array.from({ length: 12 }, (_, i) => ({ reference: `steps${i}`, levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } } ] })),
    ],
  },
  sections: [
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }, titlePage: true },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("TroDes User's Manual — Draft v0.3", { size: 16, color: "808080" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Page ", { size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 }), t(" of ", { size: 16 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16 })] })] }) },
      children: [...title, ...toc, ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9, ...s10] },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length, "bytes"); });
