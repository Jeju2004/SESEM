# Defense day checklist — Thursday 1 October 2026

From the adviser's briefing, as noted by the team on 1 Oct at 02:10. Nothing
here is decided by Claude; wording kept close to the notes.

## The presentation and the paper must cover

| Topic | Where it is covered |
|---|---|
| Constraints | Deck: "Design constraints and decisions". Paper: 3.12 Design Constraints and Decision Matrix (SDG 3) |
| Standards | Deck: "Applicable standards and regulations". Paper: 3.8 Applicable Standards and Regulations |
| Design | Deck: architecture, hardware, "How it decides". Paper: Chapter 3 |
| What we've let go | Deck: "What we let go". Paper: 3.14 Descoped Features |

## Format

- **Maximum 10 minutes.**
- Brief background only.
- **Emphasize the actual demo**, and have a backup video demo ready.

## Bring

- [ ] **4 copies of the IEEE paper** (Rev 6, printed after the TOC is updated and the PDF exported).
- [ ] **User's manual.**
- [ ] **1 recommendation form.** A copy for the 3 panel members, if required. It serves as the conformity.
- [ ] **Photocopy of the Official Receipt.**
- [ ] **PPT** (deck v0.3), plus a PDF copy on a USB stick.
- [ ] **Prototype:** wearable, beacons, door node, chargers and cables.
- [ ] **Actual demo:** setup per the demo slide, checked before entering.
- [ ] **Video demo:** on the laptop and a USB stick.
- [ ] **Snacks (meryenda)** for the panel.
- [ ] **Business attire.**

## Where

- **Holding room: N205B.**
- **Panel:** 3 members.

## After the defense

- [ ] **Submit the device**, and keep proof of submission of the prototype.
- [ ] **Conformity of revisions.** Make the panel's requested revisions and have them signed off.
- [ ] **Submit the final IEEE paper.**

## Morning technical checks (from `House_Test_2026-09-30.md`)

- [ ] **Door node (hub) on a wall charger for at least 30 min.** On a phone, `http://192.168.4.1/api/v1/hub` should show `uptime_s` still rising.
- [ ] **Wearable charged and joined to SESEMSG.** `ap_clients` in the same readout should count it.
- [ ] **Beacons powered and placed.**
- [ ] **One full run:** door open → restricted zone → SOS → hold 3 s to cancel → acknowledge.
- [ ] **Plan B ready:** plain door-node build, the laptop dashboard on MAPUA Wi-Fi, and the wearable's laptop fallback address checked.
