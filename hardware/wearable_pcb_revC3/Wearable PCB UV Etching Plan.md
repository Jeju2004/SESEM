---
title: Wearable PCB UV Etching Plan
tags: [pcb, etching, uv, fr-2, wearable, sesem]
updated: 2026-09-27
---

# Wearable PCB — UV etching plan (paper phenolic / FR-2)

Board: **TroDes Wearable Rev C3**, 69 × 66 mm, single-sided (copper on the
bottom only). KiCad project and masks: `KiCad Rev C/` (vault) or
`Desktop\TroDes Deliverables\Wearable PCB Rev C3\`.

## 1. Pick the right mask for your resist

> **Team's board (27 Sep): paper phenolic (FR-2), pre-sensitised, positive.** Use the **POSITIVE** mask
> (page 2 of `artwork/TroDes_Wearable_RevC3_A4_UV_Masks_x12.pdf`) and follow the *positive board*
> steps. Don't scrub or clean the coated copper, and no dry film is needed. If the board's label
> says **negative**, use page 1 instead.

Both masks were plotted by KiCad (File → Plot). Settings: B.Cu + Edge.Cuts,
1:1, not mirrored, small drill marks, black and white.

| Your resist | Behaviour | Print this |
|---|---|---|
| **Dry film photoresist** (the usual roll, blue/green film) or a liquid *negative* resist | UV **hardens** it; the exposed parts stay | **`UV_MASK_NEGATIVE_trodes_wearable-B_Cu.pdf`**: copper is clear, gaps are black |
| **Pre-sensitised positive board** or positive spray resist (e.g. Positiv 20) | UV **softens** it; the exposed parts wash off | **`UV_MASK_POSITIVE_trodes_wearable-B_Cu.pdf`**: copper is black, gaps are clear |

If you're not sure, check the packaging: "dry film" means the negative mask.

**Print sheet with 12 copies (added 27 Sep):** `artwork/TroDes_Wearable_RevC3_A4_UV_Masks_x12.pdf`.
- **Page 1** is the **negative** (dry film); **page 2** is the **positive**. Print only the page you need.
- The copies are the same KiCad masks, 1:1, in a 4 × 3 layout on A4 landscape with equal 4.5 mm margins.
- Spare copies are for a second attempt, or for stacking two copies if one isn't opaque enough.
- The matching component-side sticker is `artwork/TroDes_Wearable_RevC3_A4_Sticker_x12.pdf`, also 12 per sheet. Print it on A4 sticker paper at 100 %, not mirrored.
  - Cut it along the outline and cut out the antenna slot.
  - Stick it on the component side **after drilling**.
  - Push a pin through each hole from the copper side.

## 2. Board checks (27 Sep, KiCad 9.0.3)

- DRC: 0 errors, 0 warnings, 0 unconnected.
- ERC: 0.
- Schematic ↔ PCB: 0 differences.

| Worst case on the copper | Value | Enough for UV on FR-2? |
|---|---|---|
| Gap between different nets | 0.47 mm (R1 pad 2 ↔ Q1 emitter) | Yes. UV holds about 0.2 mm |
| Gap to the ground pour | 0.45 mm | Yes |
| Narrowest track | 0.6 mm | Yes |
| Tracks and pads to the board edge | 1.1 mm (ground pour 0.5 mm) | Yes |
| Pad ring | 0.6 mm (0.8/1.3 mm holes), 0.45 mm (1.0 mm header holes) | Yes. Drill on the centre dots |
| Hole to hole | 1.5 mm | Yes |

The project enforces these as rules: 0.4 mm clearance, plus `trodes_wearable.kicad_dru`
(tracks/pads ≥ 1 mm from the edge, pad ring ≥ 0.45 mm, track ≥ 0.5 mm).

## 3. What you need

- **Board:** FR-2 single-sided blank, cut to about **80 × 75 mm** (≥ 5 mm spare
  around the board). You cut the board to the outline after etching.
- **Masks:** transparency film for *your* printer (laser film for a laser,
  inkjet film for an inkjet).
- **UV source:** 395–405 nm LED lamp, UV strip or nail lamp. Sunlight works but
  varies a lot.
- **Glass:** a clean glass plate to press the film flat.
- **Developer:**
  - dry film: **sodium carbonate** (soda ash / washing soda), about 10 g per
    1 L of warm water (about 1 %);
  - positive board: **sodium hydroxide**, about 7 g per 1 L (about 0.7 %), or
    the kit developer.
- **Etchant:** ferric chloride, warmed to 40–45 °C.
- **Stripper:**
  - dry film: sodium hydroxide 30–50 g per 1 L;
  - positive resist: acetone.
- **Also:** gloves, goggles, plastic trays, a soft brush, fine steel wool or
  Scotch-Brite, dish soap, a permanent marker for touch-ups, a multimeter, and
  0.8 / 1.0 / 1.3 mm drill bits.

## 4. Step by step

### A. Print the mask
1. Open the mask PDF and print at **100 % / Actual size**, no fit-to-page, **A4
   landscape**. Use the darkest print setting.
2. **Measure the board outline on the film: it must be 69.0 × 66.0 mm.**
3. Hold the film up to a light. If the black isn't fully opaque, print a second
   copy and tape the two exactly on top of each other.

### B. Clean the copper
4. Scrub the blank with steel wool or Scotch-Brite and dish soap until the
   copper is evenly bright. Rinse.
5. Dry completely: pat dry, then a hair dryer on low. FR-2 soaks up water.
   **Don't touch the copper** from now on.

### C. Apply the resist
6. **Dry film:**
   - Work under dim or yellow light, away from sunlight.
   - Peel the inner, dull protective film.
   - Mist the copper with a little water and lay the film on.
   - Squeegee out bubbles and water from the centre outwards.
   - Laminate: 2–3 passes through a laminator, or a clothes iron on low
     (about 100–110 °C) over a sheet of paper, 20–30 s with firm, even
     pressure.
   - Let it cool. **Keep the outer, glossy film on.**
7. **Positive board:** in dim light, peel off the protective sticker.

### D. Expose
8. Lay the film **printed side down**, touching the board. Put the glass on top.
   - **Orientation check:** looking down through the film, the empty
     rectangular antenna slot must be on the **RIGHT**.
   - The mask is deliberately not mirrored: printed side down gives the
     correct copper-side image.
9. **Do a test strip first** on a scrap of the same board and resist. Cover
   strips of it and expose steps of 30 / 60 / 90 / 120 s.
   - Typical with a 395 nm LED lamp 5–10 cm away: dry film **60–120 s**;
     positive board **2–4 min**.
   - Use the time that gives sharp, clean edges.

### E. Develop
10. **Dry film:**
    - Wait 10–15 min, then peel off the outer glossy film.
    - Develop in the warm soda-ash bath for 1–3 min, brushing gently, until the
      unexposed (black-masked) areas dissolve and the copper shows cleanly in
      every gap.
    - Rinse.
    - Optional: a second 1–2 min UV exposure hardens the resist.
11. **Positive board:** develop in NaOH for 20–60 s until the exposed areas
    clear. Rinse at once; it over-develops quickly.
12. **Inspect with a magnifier:**
    - Fill pinholes in the resist with a permanent marker.
    - Look closely at the tightest gaps: R1/Q1 below the ESP32, around SW1,
      and between the ESP32 header pads.

### F. Etch
13. Put the board in ferric chloride at 40–45 °C and rock the tray constantly.
    Check every few minutes. It usually takes 10–25 min.
14. **Stop as soon as every gap is clear.** Rinse well.
    - Don't go above about 60 °C.
    - Don't leave FR-2 soaking longer than needed; it can swell and lift the
      copper.

### G. Strip and check
15. Remove the resist:
    - dry film: NaOH stripper, a few minutes, it flakes off;
    - positive resist: acetone.
    Rinse and dry.
16. **Check with a multimeter before drilling:**
    - +3V3 ↔ GND: open;
    - +5V ↔ GND: open;
    - VBAT ↔ GND: open;
    - SDA ↔ SCL: open;
    - each I²C line ↔ GND: open.
    Compare against the placement sheet.

### H. Drill
17. Put scrap wood underneath and drill **from the copper side**. Use sharp
    bits, high speed and light pressure; FR-2 chips and delaminates if pushed.
    Start each hole on the small centre dot.

    | Bit | Holes |
    |---|---|
    | 0.8 mm | R1–R6, C1, C2, C4, D1, Q1 |
    | 1.0 mm | All header sockets (ESP32, MAX30102, MAX17043), wire pads J1, J2, SW1, plus C3, the buzzer and the LED (0.9 mm is designed, 1.0 mm is fine) |
    | 1.3 mm | The 12 mm SOS switch |

18. **Antenna slot:** skip it on FR-2. It cracks easily, and the design already
    has no copper under the antenna.

### I. Cut to shape
19. The outline is etched as a thin copper line.
    - Score deeply along it on both sides with a utility knife against a steel
      ruler and snap (FR-2 snaps cleanly), or saw about 1 mm outside the line.
    - File or sand exactly to the line.
    - Tracks stay ≥ 1.1 mm from the edge.

### J. Protect and solder
20. Clean with isopropyl alcohol. Coat with rosin flux dissolved in alcohol, or
    tin the pads, so the copper doesn't oxidise.
21. **Soldering on FR-2:**
    - Iron at 320–340 °C, 2–3 s per joint.
    - Avoid repeated rework; FR-2 pads lift when overheated.
    - Solder the female headers first, flat on the board, then the low parts,
      then the tall ones.

## 5. Safety

- **Wear gloves and goggles.** Ferric chloride stains and corrodes, and NaOH
  is caustic.
- **Work in a ventilated area.**
- **Never pour used etchant down the drain.** Neutralise it and dispose of it
  properly.
- **Drilling FR-2:** wear a mask; the phenolic dust and smell are unpleasant.

## 6. Alternative: the iron method (toner transfer)

This is the original plan (Aug–21 Sep). It works for Rev C3: the narrowest gap
is 0.47 mm and the thinnest track 0.6 mm, both comfortable for toner transfer.

**What's different from UV**
- **Printer:** needs a **laser printer**, or a laser print from a print shop.
  Inkjet ink does not transfer.
- **What to print:** **page 2 (POSITIVE)** of
  `artwork/TroDes_Wearable_RevC3_A4_UV_Masks_x12.pdf`. Toner = copper that stays.
  - Print at 100 %, **not mirrored**. The transfer flips it into the right
    orientation.
  - Don't use page 1, and never use the old `BottomCopper_MIRRORED_…` file.
- **Paper:** toner-transfer paper (yellow "PCB transfer paper"), or glossy
  magazine paper. Not transparency film.
- **Not needed:** dry film, UV lamp, sodium carbonate, sodium hydroxide.
- **Extra:** a clothes iron and acetone (to remove the toner after etching).

**Steps**
1. **Print:** laser-print page 2 on the glossy side. Use the darkest setting;
   toner saving off. Don't touch the toner.
2. **Check the size:** measure one outline; it must be **69.0 × 66.0 mm**.
3. **Cut:** cut out one copy with about 10 mm of paper around it.
4. **Clean the copper:** scrub the FR-2 blank with steel wool or Scotch-Brite
   until bright, then wipe with IPA or acetone. Don't touch the copper
   afterwards.
5. **Place the print:** lay it **toner side down** on the copper. Fold or tape
   the paper edges round to the back so it can't slide.
6. **Iron it:**
   - dry iron (**no steam**), cotton setting;
   - a plain sheet of paper on top;
   - press hard without moving for about 1 minute;
   - then work the whole area, **especially the edges and corners**, with firm
     pressure for 2–3 more minutes.
   - **FR-2 is paper-based and heat-sensitive.** If it starts to blister or
     smell strongly, stop.
7. **Remove the paper:**
   - let the board cool;
   - soak it in warm water with a drop of dish soap for 10–15 min;
   - rub the paper off gently with your thumb;
   - clear paper fibres from the gaps with a soft toothbrush.
8. **Inspect:**
   - Fill any broken or thin track with a fine permanent marker.
   - Clear any bridged gap with a needle.
   - Orientation check: on the paper, the antenna slot is on the **LEFT**. On
     the copper after transfer, it must be on the **RIGHT** (looking at the
     copper side).
9. **Etch** in ferric chloride at 40–45 °C, as in step F above.
10. **Remove the toner** with acetone (or steel wool). Then **drill, cut and
    protect** the board as in steps H–J.

**Which method to use**
- **UV** gives cleaner edges, but needs more supplies.
- **The iron method** is cheaper and uses tools you probably have. Its only
  requirement is a laser print.
- **Either way:** the A4 sheet has 12 copies, so a failed transfer only costs
  one copy of the print.

## Related

[[Work Log]] · [[Enclosure Measurement Sheet]] · `KiCad Rev C/README.md`
