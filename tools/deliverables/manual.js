// Generates the TroDes User's Manual draft (.docx).
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
const title = [
  new Paragraph({ children: [], spacing: { before: 2400 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("TroDes", { bold: true, size: 72, color: "1F3864" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [t("Smart Elderly Safety and Emergency Monitoring System with Geofencing", { size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("An Indoor BLE-Based Localization and Safety Monitoring System for a Home for the Aged", { italics: true, size: 24 })] }),
  new Paragraph({ children: [], spacing: { before: 720 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("USER'S MANUAL", { bold: true, size: 44 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [t("Draft v0.1 — 24 September 2026", { size: 22 })] }),
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
  B("**Caregivers** — who read the dashboard, respond to alerts and look after the wearable device day to day (Sections 2, 3, 4, 6, 7 and 8)."),
  B("**Technical staff** — who install the beacons and door sensors, start the dashboard and configure the devices (Section 5 and Section 10)."),
  H2("1.2 What the system does"),
  P("TroDes tells caregivers, in real time, which area of the facility each resident is in and whether the resident needs help. It provides:"),
  B("**Zone detection** — the resident's wearable listens for small radio beacons placed in each zone and determines which zone the resident is in."),
  B("**Restricted-area alerts** — an immediate alert when a resident enters a restricted zone such as the medicine room, or when a restricted door is opened."),
  B("**SOS alerts** — the resident presses a button on the wearable to call for help."),
  B("**Battery monitoring** — the wearable's battery level is shown on the dashboard, with low- and critical-battery alerts."),
  B("**Heart rate display** — the wearable reports a heart-rate reading for display. It is not a medical measurement and raises no alert of its own (see Section 2)."),
  H2("1.3 How it works"),
  P("Each zone has one fixed beacon that continuously broadcasts a short Bluetooth Low Energy (BLE) signal identifying that zone. The wearable measures the strength of every beacon signal it receives and selects the zone whose beacon is strongest. It then reports the zone, battery level, heart rate and any alerts over the facility's WiFi to the caregiver dashboard, which runs on a computer and can be viewed in any web browser, including on a phone. Door sensor nodes on restricted doors report each opening and closing directly to the dashboard."),
  FIG("System block diagram — wearable, three beacons, door node, WiFi router, dashboard computer, caregiver browser"),
];

const s2 = [
  H1("2. Safety Information"),
  P("Read this section before using or servicing any part of the system."),
  WARN("The wearable contains a **lithium-polymer (Li-Po) battery**. Do not puncture, crush, bend, heat or immerse it. If the battery swells, becomes hot, smells or leaks, switch the device off, disconnect it, and move it away from flammable materials. Do not use a swollen battery."),
  WARN("**Charge only with the device's USB-C charging port and a standard 5 V USB charger.** Do not leave the device charging unattended overnight in a resident's room. Do not charge a device that is damaged."),
  WARN("**TroDes is not a medical device.** The heart-rate reading has not been validated against clinical equipment and must not be used for diagnosis or treatment decisions. It is displayed for information only."),
  CAUTION("TroDes supports caregivers; it does not replace supervision. Zone detection depends on radio signals and can be temporarily wrong or unavailable — for example near doorways, or when the WiFi network is down. Always verify an alert in person."),
  CAUTION("**Technical staff only:** the wearable's internal boost converter must be adjusted to **5.0 V** with a multimeter before the microcontroller board is connected. A new converter can output more than 17 V from the factory, which destroys the board. See Section 10.3."),
  CAUTION("Keep the wearable, beacons and door nodes dry. They are not water-resistant."),
];

const s3 = [
  H1("3. System Components"),
  table(["Component", "Qty (demo)", "Where it goes", "Power"], [
    ["**Wearable device**", "1 per resident", "Worn by the resident", "Rechargeable 3.7 V Li-Po battery"],
    ["**Zone beacon**", "3 (one per zone)", "Fixed in each zone — bedroom wing, dining hall, medicine room", "5 V USB adapter"],
    ["**Door sensor node**", "1 (medicine room door)", "On the frame of each restricted door", "5 V USB adapter"],
    ["**Dashboard computer**", "1", "Caregiver station, on the facility WiFi", "Mains"],
    ["Caregiver's browser or phone", "Any", "Anywhere on the same WiFi network", "—"],
  ], [2200, 1500, 3560, 2100]),
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
    ["**SOS button**", "Short press: send an SOS alert. Press and hold for 3 seconds: cancel a false alarm."],
    ["**Power switch**", "Slide to ON (battery) or OFF."],
    ["**Buzzer**", "Sounds tones to confirm actions and to warn the resident (Section 4.3)."],
    ["**Status LED**", "Lights together with each buzzer tone."],
    ["**USB-C charging port**", "Charges the battery (Section 6.2)."],
    ["**Heart-rate sensor**", "Reads pulse when in contact with the skin."],
  ], [2600, 6760]),
  SP(),
  H2("4.2 Wearing the device"),
  P(["The device is worn ", tbd("wearing position — wrist strap / waist clip / lanyard — pending adviser decision"), ". Keep it on the body and uncovered by metal objects. For a heart-rate reading, the sensor must touch the skin ", tbd("confirm sensor placement for the final build"), "."]),
  H2("4.3 Tones and what they mean"),
  table(["Tone", "Meaning", "What to do"], [
    ["Two short beeps", "Device has switched on and started", "Nothing — normal start-up"],
    ["Three beeps", "SOS alert sent", "A caregiver will respond"],
    ["One long, low tone", "SOS cancelled (button held 3 s)", "Nothing"],
    ["Four quick high beeps", "Resident has entered a **restricted zone**", "Caregiver: check on the resident"],
    ["Two medium beeps", "Battery low (20 %) or critical (10 %)", "Charge the device soon"],
    ["Two short low chirps, repeated every minute", "Device cannot reach the dashboard (WiFi down)", "See Section 7"],
  ], [2500, 3600, 3260]),
];

const s5 = [
  H1("5. Installation and Setup (Technical Staff)"),
  P("Install the parts in this order: beacons, door sensor node, dashboard, then the wearable."),
  H2("5.1 Placing the zone beacons"), ...restart(),
  P("Each beacon is labelled with its zone name. Install one beacon per zone."),
  N("Place the beacon **in the centre of its zone**, not in a corner. In a building, the best separation is achieved when each zone is a separate room with walls between zones."),
  N("Mount every beacon at the **same height, 1.2 to 1.5 m**, with the antenna end (the end opposite the USB port) pointing **upward** and at least a few centimetres from walls, metal objects and other electronics."),
  N("Keep beacons **apart from one another** — never side by side. Tests showed that crowded beacons can differ in signal strength by 11 dB, against 4 dB when spaced apart."),
  N("Connect each beacon to a 5 V USB adapter and route the cable downward, away from the antenna end."),
  N("If a power bank is used instead of an adapter, confirm that it does not switch itself off: leave the beacon running on it for 30 minutes and check that the zone is still detected."),
  CAUTION("If two or more zones must share one room (for example in a demonstration), zones are only reliably distinguished within about 1 m of each beacon. Use the system's proximity mode and place the beacons as far apart as the room allows (Section 10.2)."),
  FIG("Beacon in its enclosure, mounted at 1.2–1.5 m with the antenna end up"),
  H2("5.2 Installing the door sensor node"), ...restart(),
  N("Fix the node's enclosure on the wall beside the restricted door, within reach of a power outlet."),
  N("Fix the **reed switch** on the door frame and the **magnet** on the door, directly opposite each other and at the same height, so that they are within the switch's operating gap when the door is closed."),
  N(["Connect the node to its 5 V USB adapter. Open and close the door and confirm that the dashboard's ", t("Restricted doors", { bold: true }), " panel shows the change within a few seconds."]),
  P(["Operating gap of the supplied reed switch: ", tbd("check datasheet — typically 10–15 mm"), "."]),
  FIG("Door sensor node — enclosure, reed switch on frame, magnet on door"),
  H2("5.3 Starting the dashboard"), ...restart(),
  N("Connect the dashboard computer to the facility WiFi network. Set it never to sleep while the system is in use."),
  N("Open PowerShell and start the dashboard server, then leave the window open:"),
  CODE("cd C:\\Users\\Chester\\Desktop\\Vaya\\SESEM\\dashboard"),
  CODE("& \"C:\\TroDesData\\dashboard\\.venv\\Scripts\\python.exe\" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"),
  SP(),
  N("On the same computer, open a web browser at `http://localhost:8000`."),
  N("To view the dashboard on a phone or another computer on the same WiFi, find the dashboard computer's address with `ipconfig` (IPv4 Address) and open `http://<that address>:8000`. If the page does not load, allow Python through Windows Firewall when prompted."),
  H2("5.4 Connecting the wearable and door node to WiFi"),
  P(["The WiFi name, password and dashboard address are stored in a configuration file on each device (`include/secrets.h` for the wearable), which is loaded when the device is programmed. See the Board Programming Guide in the project repository. After programming, the dashboard shows the resident card within about 10 seconds of switching the wearable on."]),
  H2("5.5 First-use checklist"),
  table(["Check", "Expected result"], [
    ["Switch the wearable on", "Two short beeps; resident card appears on the dashboard"],
    ["Stand beside each beacon for 10 seconds", "Dashboard shows that zone"],
    ["Walk up to the medicine room beacon", "Four quick beeps; red restricted-zone alert"],
    ["Open the medicine room door", "Door alert on the dashboard"],
    ["Press the SOS button briefly", "Three beeps; SOS banner on the dashboard"],
    ["Hold the SOS button for 3 seconds", "Long low tone; SOS cleared"],
  ], [4200, 5160]),
];

const s6 = [
  H1("6. Daily Operation (Caregivers)"),
  H2("6.1 Switching the wearable on and off"),
  P("Slide the power switch to ON. Two short beeps confirm that the device has started. Slide the switch to OFF when the device is not being worn, or before charging if preferred."),
  H2("6.2 Charging the battery"), ...restart(),
  N("Connect a standard 5 V USB-C charger to the wearable's charging port."),
  N(["The charging indicator shows ", tbd("confirm module LED colours — typically red while charging, blue or green when full"), "."]),
  N("Disconnect the charger when charging is complete."),
  P(["Battery life per charge: ", tbd("measured runtime — to be filled in after the battery runtime test"), ". Charge the device every day, and whenever the dashboard shows a low-battery alert."]),
  H2("6.3 Using the SOS button (resident)"),
  B("**To call for help:** press the SOS button briefly. Three beeps confirm that the alert has been sent."),
  B("**To cancel a false alarm:** press and hold the SOS button for **3 seconds** until a long, low tone sounds."),
  H2("6.4 Reading the dashboard"),
  FIG("Dashboard screenshot — resident card, alert banner, restricted doors panel, recent activity"),
  P("The dashboard updates automatically every 2 seconds. It has four areas:"),
  table(["Area", "What it shows"], [
    ["**Residents**", "One card per resident: current zone (green = safe, red = restricted, grey = unknown), time in the zone, battery level, heart rate and when the device was last heard from."],
    ["**Active alerts**", "Alerts that have not yet been acknowledged, most urgent first. A critical alert also appears as a red banner across the top of the page."],
    ["**Restricted doors**", "Each restricted door as open or closed, or OFFLINE if its node has stopped reporting."],
    ["**Recent activity**", "A log of recent zone changes, door events and alerts."],
  ], [2400, 6960]),
  SP(),
  H2("6.5 Status indications on a resident card"),
  table(["Indication", "Meaning"], [
    ["Zone in **green**", "Resident is in a safe zone"],
    ["Zone in **red**", "Resident is in a restricted zone"],
    ["Zone unknown (grey)", "No beacon is close enough to decide — often near a doorway or between zones"],
    ["Battery in **amber**", "20 % or less"],
    ["Battery in **red**", "10 % or less — charge now"],
    ["Heart rate shown as \"—\"", "No reading (sensor not in contact with the skin)"],
    ["Whole card **greyed out**", "No report from the wearable for 30 seconds — treat as a safety event and check the resident"],
  ], [3400, 5960]),
  SP(),
  H2("6.6 Alerts and how to respond"),
  table(["Alert", "Severity", "Response"], [
    ["SOS pressed", "**Critical**", "Go to the resident immediately"],
    ["Entered restricted zone", "**Critical**", "Go to the resident and guide them out"],
    ["Restricted door opened", "**Critical**", "Check the door and who opened it"],
    ["Battery critical (10 %)", "**Critical**", "Charge or replace the wearable now"],
    ["Battery low (20 %)", "Warning", "Charge soon"],
    ["Zone lost (no beacon in range)", "Warning", "Locate the resident"],
    ["Device not reporting", "Warning", "Check the resident and the wearable"],
    ["SOS cancelled, zone change, door closed", "Information", "No action needed"],
  ], [3600, 1600, 4160]),
  SP(),
  P("Critical and warning alerts stay on the dashboard until a caregiver acknowledges them. Only an SOS is cleared automatically, when the resident cancels it. **To acknowledge an alert**, press its acknowledge button after responding; the dashboard records who acknowledged it and when."),
];

const s7 = [
  H1("7. When WiFi Is Unavailable"),
  P("If the wearable cannot reach the dashboard:"),
  B("The wearable keeps working. It continues to detect zones and to respond to the SOS button, and it **stores the events** it could not send."),
  B("It sounds **two short low chirps every minute** so that the loss of connection is not silent."),
  B("On the dashboard, the resident card greys out after 30 seconds, and a banner reports that there is no connection."),
  B("When the connection returns, the stored events are delivered together; the dashboard places them in their correct order."),
  P("If a door node loses power or WiFi, the dashboard marks that door OFFLINE after 90 seconds, rather than showing its last state."),
  CAUTION("During a WiFi outage, alerts reach caregivers only through the wearable's own buzzer. Restore the network as soon as possible and check residents in person."),
];

const s8 = [
  H1("8. Troubleshooting"),
  table(["Problem", "Likely cause", "What to do"], [
    ["Wearable does not beep when switched on", "Battery flat, or charger protection has tripped", "Charge for at least 30 minutes, then switch on again"],
    ["Resident card greyed out", "Wearable off, out of WiFi range, or battery flat", "Check the resident; check the wearable is on and charged"],
    ["Zone shows unknown", "Resident is between zones or near a doorway", "Normal near doorways; if it persists in the middle of a zone, check that zone's beacon is powered"],
    ["Wrong zone shown", "Beacon moved, blocked or too close to another beacon", "Check beacon placement (Section 5.1)"],
    ["Chirps every minute", "No WiFi connection to the dashboard", "Check the WiFi network and that the dashboard computer is on and not asleep"],
    ["Heart rate shows \"—\"", "Sensor not touching the skin", "Adjust the wearable's position"],
    ["Door shows OFFLINE", "Door node unpowered or off the WiFi", "Check its USB adapter and the WiFi network"],
    ["Door state wrong", "Magnet and reed switch misaligned", "Realign so they face each other within the operating gap"],
    ["Dashboard page does not load on a phone", "Different WiFi network, or firewall", "Join the same WiFi; allow Python through Windows Firewall"],
  ], [2700, 3100, 3560]),
];

const s9 = [
  H1("9. Care and Maintenance"),
  B("Charge the wearable daily. If it will be stored for a long time, store it at about half charge and recharge it every three months."),
  B("Wipe the devices with a dry or slightly damp cloth. Do not use solvents or immerse them."),
  B("Check each month that every beacon and door node is powered, that door magnets are aligned, and that each zone is detected (repeat the checklist in Section 5.5)."),
  B("Do not open the wearable. Battery replacement and internal adjustment are for technical staff only."),
  B("Dispose of Li-Po batteries and electronic parts at an appropriate electronic-waste collection point, not with household waste."),
];

const s10 = [
  H1("10. Technical Information"),
  H2("10.1 Specifications"),
  table(["Item", "Specification"], [
    ["Microcontroller (all devices)", "ESP32-WROOM-32 development board"],
    ["Localization method", "BLE iBeacon received signal strength (RSSI), one beacon per zone"],
    ["Zone decision", "Every 300 ms; a new zone must lead by 4 dB for 3 consecutive checks"],
    ["Status report to dashboard", "Every 5 s (standard) or 10 s (low-power setting)"],
    ["Wearable battery", "3.7 V, 1000 mAh lithium-polymer"],
    ["Charging", "USB-C, TP4056 charger with DW01 protection"],
    ["Wearable power supply", "Battery → MT3608 boost converter (5.0 V) → board regulator (3.3 V)"],
    ["Battery measurement", "Voltage divider on GPIO 34 (optional MAX17043 fuel gauge)"],
    ["Battery alerts", "Low at 20 %, critical at 10 %"],
    ["Heart-rate sensor", "MAX30102 optical sensor (display only)"],
    ["SOS button", "Short press = alert; hold 3 s = cancel"],
    ["Door sensor", "Magnetic reed switch; heartbeat every 30 s; marked offline after 90 s"],
    ["Beacon transmit power", "+9 dBm (all beacons identical)"],
    ["Dashboard", "Web application (FastAPI server with SQLite database), any browser including phones"],
    ["Wearable battery life", [t("Target 24 h. Measured: "), tbd("to be filled in after the runtime test")]],
  ], [3300, 6060]),
  SP(),
  H2("10.2 Measured localization performance"),
  P("From Test 2, Run 1 (24 September 2026):"),
  B("Between zones in **separate rooms**: **no cross-room errors** — the system never reported the wrong room."),
  B("Between zones **sharing one room**: reliable only within about **1 m** of each beacon. For such layouts the firmware provides a proximity mode, in which a zone is entered only when its beacon is close."),
  B("Unresolved readings occurred at doorways, where every beacon signal was weakest; the system reports \"unknown\" there rather than a wrong zone."),
  P([tbd("Add the single-room (dorm) Test 2 Run 2 results and the Test 3 latency figures when available.")]),
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
    ["RSSI", "Received Signal Strength Indicator, in dBm; values closer to zero are stronger"],
    ["Zone", "An area of the facility — safe or restricted — identified by its beacon"],
    ["Restricted zone", "An area residents should not enter unaccompanied, such as the medicine room"],
    ["Reed switch", "A magnetically operated switch that detects whether a door is closed"],
    ["Dashboard", "The caregiver's web page showing residents, alerts and doors"],
  ], [2400, 6960]),
];

// ---------- document ----------
const doc = new Document({
  creator: "TroDes team", title: "TroDes User's Manual — Draft v0.1",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: "1F3864" }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "2E5496" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
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
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("TroDes User's Manual — Draft v0.1", { size: 16, color: "808080" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Page ", { size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 }), t(" of ", { size: 16 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16 })] })] }) },
      children: [...title, ...toc, ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9, ...s10] },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length, "bytes"); });
