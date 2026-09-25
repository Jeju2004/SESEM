// Progress Report No. 3 draft. Usage: node pr3.js <out.docx>
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, LevelFormat, HeadingLevel, Footer, PageNumber,
} = require("docx");
const OUT = process.argv[2];
const FONT = "Arial";
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: 21, ...o });
const tbd = (text) => new TextRun({ text: `[${text}]`, font: FONT, size: 21, highlight: "yellow", bold: true });
function runs(parts) {
  const list = Array.isArray(parts) ? parts : [parts];
  const out = [];
  for (const p of list) {
    if (typeof p !== "string") { out.push(p); continue; }
    const re = /(\*\*[^*]+\*\*)/g; let last = 0, m;
    while ((m = re.exec(p))) { if (m.index > last) out.push(t(p.slice(last, m.index))); out.push(t(m[0].slice(2, -2), { bold: true })); last = m.index + m[0].length; }
    if (last < p.length) out.push(t(p.slice(last)));
  }
  return out;
}
const P = (parts, o = {}) => new Paragraph({ children: runs(parts), alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, ...o });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text, { bold: true, size: 24 })], spacing: { before: 240, after: 120 } });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text, { bold: true })], spacing: { before: 160, after: 80 } });
const D = (parts) => new Paragraph({ children: runs(parts), numbering: { reference: "dash", level: 0 }, spacing: { after: 60 } });
let cur = 0; const restart = () => { cur++; return []; };
const N = (parts) => new Paragraph({ children: runs(parts), numbering: { reference: `n${cur}`, level: 0 }, spacing: { after: 60 } });
const TODO = (text) => new Paragraph({ children: [tbd(text)], spacing: { after: 120 } });
const b = { style: BorderStyle.SINGLE, size: 4, color: "808080" }; const borders = { top: b, bottom: b, left: b, right: b };
function table(header, rows, widths) {
  const cell = (c, w, head) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "E7E6E6" } : undefined,
    children: [new Paragraph({ children: head ? [t(c, { bold: true, size: 19 })] : runs(c).map((r) => r), spacing: { after: 0 } })] });
  return [new Table({ width: { size: widths.reduce((a, x) => a + x, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true)) }), ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) }))] }),
    new Paragraph({ children: [], spacing: { after: 120 } })];
}
const C = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, children: [t(text, o)], spacing: { after: 40 } });

const body = [
  C("MAPÚA UNIVERSITY", { bold: true }),
  C("School of Electrical, Electronics and Computer Engineering"),
  C("Electronics Design"),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 }, children: [t("PROGRESS REPORT NO. 3", { bold: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [t("Smart Elderly Safety and Emergency Monitoring System with Geofencing: An Indoor BLE-Based Localization and Safety Monitoring System for a Home for the Aged", { bold: true })] }),
  ...table(["Group Members", "Section", "Adviser", "Reporting Period", "Date Submitted"], [
    ["Chester John B. Cirio\nPathrish Anne R. Cruz".split("\n").join(" · "), "C1", "Glenn V. Magwili", "22 – 28 September 2026", [tbd("date")]],
  ], [2600, 900, 1800, 2160, 1900]),

  H1("1. Summary of Progress"),
  P("This period prepared the project for the oral defense, now scheduled for Friday, 2 October 2026. The Request for Billing Form was completed. On 24 September the adviser permitted perfboard construction for the final prototype, removing board etching from the critical path. The zone classification test (Test 2) was conducted for the first time, the wearable firmware was brought into line with the approved three-zone scope and the Revision B/C hardware, and drafts of the User's Manual, the IEEE paper (Revision 3) and the defense presentation were completed."),
  P("The principal findings are that zone classification across a wall produced no cross-room errors, while two zones sharing one room were distinguishable only within about one metre of their beacons. Because the defense room is a single space, a proximity mode was added to the firmware. A power-supply fault destroyed one development board; its cause was measured and a mandatory adjustment step introduced."),
  P(["The project is assessed at approximately ", tbd("65"), " percent completion (Section 4)."]),

  H1("2. Work Completed This Period"),
  H2("2.1 Defense Scheduling and Request for Billing"),
  P("Form FM-EEC-25, the Design Oral Presentation and Billing Form, was signed by the adviser on 24 September 2026 and completed by the team. The oral defense is scheduled for Friday, 2 October 2026."),
  TODO("Record the Official Receipt number, presentation time and panel members once assigned."),
  H2("2.2 Adviser Decision — Perfboard Construction"),
  P("On 24 September 2026 the adviser permitted the final prototype to be constructed on perfboard. The wearable and door sensor node are therefore being assembled as module carriers on perfboard, with the development board and sensor modules on female headers. The single-sided printed circuit board layout (Revision C, 69 × 66 mm, no wire links) is retained as design documentation. The contingency agreed on 21 September now applies to the perfboard builds: if they are not operational by Monday, 28 September, the demonstration proceeds on the breadboard."),
  H2("2.3 Wearable Firmware"),
  D("Zone table reduced to the approved three zones — bedroom wing and dining hall (safe), medicine room (restricted) — with the dashboard configuration and device simulator updated to match."),
  D("I²C pins reassigned (SDA to GPIO 22, SCL to GPIO 21) to match the Revision C layout and the perfboard build."),
  D("Fuel-gauge driver corrected from the MAX17048 to the MAX17043 shown on the schematic; the previous setting would have misread the cell voltage."),
  D("Battery measurement through the voltage divider, now the primary source, uses a 16-sample calibrated average and a piecewise lithium-polymer voltage-to-percentage table in place of a linear map."),
  D("A proximity mode, disabled by default, enters a zone only when its beacon exceeds a calibrated signal level and holds the last zone between beacons, for zones that share one room."),
  D("A low-power profile, disabled by default, uses a passive scan at 30 percent radio duty, an 80 MHz processor clock and a 10 s status period, in preparation for the battery runtime measurement."),
  D("Every configuration compiles, and the updated firmware was flashed to the replacement wearable, which detected all three beacons, switched zones and raised the restricted-zone alert."),
  H2("2.4 Caregiver Dashboard and Code Management"),
  P("The dashboard source was placed under version control together with all firmware, analysis tools and raw test captures in a private repository. The automated self-test suite passes all 38 checks against the three-zone configuration, and a scripted run of the defense scenario completed without error."),
  H2("2.5 Documentation"),
  D("User's Manual, Draft 0.1 (15 pages): safety, components, installation, daily operation, alerts, network-loss behaviour, troubleshooting, maintenance and specifications."),
  D("IEEE paper, Revision 3: Chapters 2 to 5 drafted, including a verified literature review, component computations, a weighted decision matrix tied to SDG 3, and the Test 1 and Test 2 results."),
  D("Defense presentation, 13 slides for the ten-minute limit, with speaker notes."),

  H1("3. Test Results"),
  H2("3.1 Test 2 — Zone Classification Accuracy, Run 1"),
  P("**Conditions.** 24 September 2026; 495 samples at 16 labelled points (near, mid, far and boundary points per zone, boundaries approached from both sides); firmware in room mode. Only two rooms were available: the bedroom wing and medicine room beacons shared one room and the dining hall beacon occupied the other."),
  ...table(["True \\ Reported", "Bedroom", "Dining", "Medicine", "Unknown", "Recall"], [
    ["Bedroom wing", "134", "0", "79", "58", "49.4 %"], ["Dining hall", "0", "88", "0", "16", "84.6 %"], ["Medicine room", "23", "0", "56", "41", "46.7 %"],
  ], [2160, 1400, 1400, 1400, 1400, 1600]),
  P("**Result.** Overall accuracy was 56.2 percent and 23.2 percent of samples were unresolved, against a prediction of 74 percent and 21 percent for the same four point types. There were no cross-room errors between the two rooms. Within the shared room, the medicine room beacon read as strong as the bedroom wing beacon at the bedroom's mid and far points, so only the points within about one metre of each beacon classified reliably. Every unresolved sample occurred at a boundary point, where all beacons were below the −88 dBm detection floor."),
  P("**Design consequence.** Because the defense demonstration takes place in a single room, the proximity mode described in Section 2.3 was added. A second run in a single room, in both modes, is scheduled before the defense."),
  H2("3.2 Beacon Matching — Re-check"),
  P("With the replacement wearable, the three beacons differed by 11 dB when placed side by side, and by 4 dB when spaced 30 cm apart on a 1 m arc with two beacons exchanged; the weak reading stayed with the position rather than the beacon. The beacons remain matched, and mounting guidance (spacing, equal height and orientation) was written into the User's Manual."),
  H2("3.3 Power Supply Verification"),
  P("On first power-up of the breadboard wearable, the development board failed. The boost converter output measured 17.64 V with no load — its factory setting — which exceeds the input rating of the board's regulator. After adjustment to 5.03 V a replacement board operated normally, and the converter's protection circuit reset correctly. Measuring the converter at 5.0 V before any board is connected is now a required step."),

  H1("4. Assessment of Completion"),
  ...table(["Work area", "Weight", "Complete", "Basis"], [
    ["Firmware, three board types", "15 %", [tbd("95 %")], "Three-zone scope, Rev C pins, gauge and battery corrections, proximity and low-power modes"],
    ["Caregiver dashboard and backend", "20 %", [tbd("90 %")], "Verified against the three-zone configuration; live hardware integration outstanding"],
    ["Localization validation", "15 %", [tbd("55 %")], "Test 1 and Test 2 Run 1 complete; single-room run and Test 3 pending"],
    ["Prototype hardware", "25 %", [tbd("45 %")], "Schematic and layout complete; perfboard assembly in progress"],
    ["Documentation", "20 %", [tbd("65 %")], "Manual, paper Rev 3 and presentation drafted; results to be added"],
    ["**Overall**", "100 %", [tbd("≈ 65 %")], ""],
  ], [2500, 1000, 1300, 4560]),
  TODO("Confirm these percentages as a team before submission."),

  H1("5. Problems Encountered and Resolutions"),
  ...table(["Problem", "Effect", "Resolution"], [
    ["Boost converter shipped at 17.64 V", "Destroyed one development board; one spare remains", "Converter adjusted to 5.03 V; mandatory measurement step added; one additional board to be purchased"],
    ["Two zones sharing one room", "Mid-room points misclassified in Test 2 Run 1", "Proximity mode added; single-room test scheduled"],
    ["Doorway coverage", "All unresolved samples at doorways", "Reported as a limitation; recommendation for further study"],
    ["Beacon placement sensitivity", "11 dB spread side by side", "Spacing and mounting rules established"],
    ["Firmware did not match the schematic", "Wrong fuel-gauge type; I²C pins not updated for Rev C", "Both corrected and verified on hardware"],
  ], [2700, 3000, 3660]),

  H1("6. Matters Requiring the Adviser's Direction"),
  D("**Written confirmation of the perfboard allowance.** The course requirements state that the project must be in PCB; confirmation for the panel is requested."),
  D("The presentation type ticked on the billing form (Proposal or Final)."),
  D("Measurable targets for zone accuracy and alert latency, so that Chapter 4 can show whether the objectives were met."),
  D("Acceptance of the calculated runtime shortfall against the 24-hour target, caused by a sourcing constraint, as a Chapter 5 recommendation."),
  D("Heart-rate alert thresholds (currently display-only), the SOS hold duration (currently 3 s), and the network-loss behaviour."),
  D("Beacon power source, battery backup for door nodes, and the standards to be cited."),

  H1("7. Plan to the Defense"),
  ...restart(),
  N("Complete and test the perfboard wearable and door node by Monday, 28 September."),
  N("Conduct the single-room zone classification run in room mode and proximity mode, and calibrate the entry threshold."),
  N("Conduct Test 3, transition latency and boundary stability."),
  N("Measure battery runtime in the low-power profile."),
  N("Integrate the wearable and door node with the dashboard over the network and rehearse the demonstration."),
  N("Complete the paper, manual and presentation with the new results."),

  H1("8. Risks to Completion"),
  ...table(["Risk", "Mitigation"], [
    ["Perfboard builds not operational by 28 September", "Breadboard demonstration, as agreed with the adviser"],
    ["Further development-board failure", "Mandatory 5.0 V check; purchase of one additional board"],
    ["Radio behaviour in the defense room differs from testing", "Calibrate the proximity threshold in the room if accessible; scripted simulator as a declared backup"],
    ["Runtime measurement not completed in time", "Report the calculated figure clearly labelled as calculated, with the measurement as further work"],
  ], [4400, 4960]),

  H1("9. Certification"),
  P("This report is submitted in fulfilment of the requirements of the Electronics Design course."),
  ...table(["", "Signature over printed name", "Date"], [
    ["Submitted by", "__________________  Chester John B. Cirio", ""], ["Submitted by", "__________________  Pathrish Anne R. Cruz", ""], ["Noted by (Adviser)", "__________________  Engr. Glenn V. Magwili", ""],
  ], [2400, 4960, 2000]),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: { config: [
    { reference: "dash", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ...Array.from({ length: 4 }, (_, i) => ({ reference: `n${i}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] })),
  ] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1260, right: 1260, bottom: 1260, left: 1260 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Progress Report No. 3 · Page ", { size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 })] })] }) },
    children: body }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
