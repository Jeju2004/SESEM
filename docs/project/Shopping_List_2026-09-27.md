---
title: Shopping List 2026-09-27
tags: [bom, shopping, wearable, beacon, etching, sesem]
updated: 2026-09-27
---

# Shopping list — 27 Sep 2026

- **Wearable** parts come from the final Rev C3 schematic BOM.
- **Beacon** parts come from [[Beacon Node Perfboard Build]].
- **Etching** supplies come from [[Wearable PCB UV Etching Plan]].
- "Have" means you already have it (from our earlier builds).
- **Spares** are in brackets: cheap parts that are easy to lose or break.

## A. Wearable circuit (Rev C3 PCB)

| # | Ref | Part — what to ask for | Qty | Status |
|---|---|---|---|---|
| 1 | U1 | ESP32 DevKitC **38-pin** (ESP32-WROOM-32), 55 × 28 mm | 1 | Have |
| 2 | U2 | MAX30102 heart-rate module (black, 20 × 15 mm, 2 × 4 pins) | 1 | Have |
| 3 | U3 | MAX17043 LiPo fuel gauge module (SparkFun layout, JST-PH) | 1 | Coming |
| 4 | M1 | TP4056 charger module **with protection (DW01)**, **USB Type-C** | 1 | Have |
| 5 | M2 | MT3608 boost module | 1 | Have |
| 6 | BT1 | Li-Po 3.7 V ~1000 mAh, 50 × 33 × 5 mm, with JST-PH 2.0 lead | 1 | Have |
| 7 | SW1 | Mini toggle switch SPDT, 3 A (MTS-102 type), 6 mm bushing | 1 | Have |
| 8 | SW2 | **Tactile switch 12 × 12 mm, 4-pin THT**: the team's is **13 mm tall** (enclosure updated for it) | 1 (+1) | Have |
| 9 | BZ1 | Passive buzzer 12 mm (12 × 9.5 mm, legs 7.6 mm apart) | 1 | Have |
| 10 | Q1 | 2N2222A transistor, TO-92 | 1 (+1) | Buy |
| 11 | D1 | 1N4148 diode | 1 (+2) | Buy |
| 12 | D2 | LED 5 mm, any colour (blue or green shows well) | 1 (+2) | Buy |
| 13 | R1 | Resistor 1 kΩ, ¼ W | 1 (+2) | Buy |
| 14 | R2 | Resistor 330 Ω, ¼ W | 1 (+2) | Buy |
| 15 | R3, R4 | Resistor 100 kΩ, ¼ W (1 % if they have it) | 2 (+2) | Buy |
| 16 | R5, R6 | Resistor 4.7 kΩ, ¼ W | 2 (+2) | Buy |
| 17 | C1 | Electrolytic 100 µF, 10–16 V, **6.3 mm Ø, 2.5 mm lead spacing** | 1 (+1) | Buy |
| 18 | C2, C4 | Ceramic 100 nF ("104"), 5 mm lead spacing | 2 (+2) | Buy |
| 19 | C3 | Electrolytic 470 µF, 10–16 V, **10 mm Ø, 5 mm spacing, ≤ 13 mm tall** (low-profile) | 1 | Buy |

- **SW2 height:** the enclosure's SOS plunger is now sized for the team's **13 mm**
  switch. A spare must be the **same 13 mm height**; otherwise tell me the height.
- **C3 height:** a tall 470 µF (10 × 20 mm) would hit the lid.

## B. Female headers — how many and which kind

**Kind:** 2.54 mm pitch, **single row, straight**, gold or tin. Buy the **same
height as the ones you already used (you measured 5 mm, "low profile")**. If
the shop only has standard **8.5 mm**, buy those and tell me: the enclosure
lid grows by 3.5 mm, one number in the model. **Don't mix the two heights on
one board.**

Female headers are cut by sacrificing one socket, so buy the next size up.

| Use | Needed | Buy | Qty |
|---|---|---|---|
| Wearable U1 (ESP32) | 2 × 19 | **1×20** (cut 1 off each) | 2 |
| Wearable U2 (MAX30102) | 2 × 4 | **1×5** (cut 1 off each) | 2 |
| Wearable U3 (MAX17043) | 2 × 3 | **1×3** | 2 |
| Spares | — | 1×20 ×2, 1×5 ×1, 1×3 ×1 | 4 |
| **Totals** | | **1×20 × 4 · 1×5 × 3 · 1×3 × 3** | |

The **beacons and the door node get no female headers**: their ESP32s are
soldered directly to the perfboard (team decision, 27 Sep). Only the wearable
uses headers.

**Also buy, for the heart-rate sensor (it must reach the lid window):**

| Part | Qty | Why |
|---|---|---|
| **Arduino stackable header (long-leg female header), 1×6, 2.54 mm** | 2 | Cut each to 4. They plug between the PCB socket and the MAX30102 and lift the sensor about 8.5 mm, so its face sits right under the finger window in the lid |

## C. Wiring and assembly

| Part | Qty |
|---|---|
| Stranded hook-up wire **24–26 AWG**, silicone: red, black, one more colour | ~1 m each |
| JST-PH 2.0, 2-pin, **male + female pair with 10 cm leads** (battery ↔ TP4056; fuel-gauge lead) | 3 pairs |
| Heat-shrink tubing, 2–4 mm assorted | 1 small pack |
| Kapton (polyimide) tape, 10–20 mm | 1 roll |
| Double-sided foam tape | 1 roll |
| Solder 0.6–0.8 mm rosin core, flux pen, desoldering wick | As needed |

## D. Enclosure (3D-printed)

| Part | Qty | Why |
|---|---|---|
| PLA or PETG filament | ~60 g wearable + ~40 g per beacon box | Printing |
| M3 × 6 mm pan-head screws | 2 (+2) | Belt clip to the case: through the 2 mm floor into the 5 mm clip plate, self-tapping. An 8 mm screw would poke through the clip |

The lid snaps on; no screws.

## E. UV etching (paper phenolic / FR-2)

**Update:** the team has a **pre-sensitised (positive) FR-2 board**. Use the **POSITIVE mask** (page 2).
Items 2, 6, 7 and 13 are **not needed**, and sodium hydroxide (item 8) is now the **developer**.
**Add acetone** to remove the leftover resist after etching.

| # | Item | Qty | Note |
|---|---|---|---|
| 1 | FR-2 single-sided copper board | 1 extra | For the exposure test strip or a second try |
| 2 | ~~Dry film photoresist~~ | — | **Not needed**: the board is pre-sensitised |
| 3 | Transparency film for **your** printer type | 3–4 A4 sheets | Laser film for a laser printer, inkjet film for an inkjet |
| 4 | UV lamp 395–405 nm (LED nail lamp ≥ 36 W, UV LED strip or panel) | 1 | |
| 5 | Glass plate (a photo-frame glass) + 4 binder clips | 1 | Presses the film flat |
| 6 | ~~Laminator~~ | — | **Not needed** |
| 7 | ~~Sodium carbonate~~ | — | **Not needed** (it was the dry-film developer) |
| 8 | **Sodium hydroxide** (lye / pure caustic soda) | 50–100 g | **Developer** for the positive board, about 7 g/L. Use the kit's developer powder instead if one came with the board |
| 9 | **Ferric chloride** (powder or solution) | 250–500 g | Etchant |
| 10 | Plastic trays (not metal) | 3 | Developer, etchant, rinse |
| 11 | Nitrile gloves, safety goggles | 1 set | |
| 12 | Soft brush (small paintbrush or soft toothbrush) | 1 | Developing |
| 13 | ~~Steel wool~~ | — | **Not needed.** Never scrub a pre-sensitised board: it removes the coating |
| 14 | Fine permanent marker | 1 | Touch-ups |
| 15 | Isopropyl alcohol (70–99 %) | 1 bottle | Cleaning |
| 16 | Kitchen scale or measuring spoons | 1 | Mixing |
| 17 | Plastic bottle with lid | 1 | Storing used etchant (never down the drain) |
| 18 | Mini drill or pin vise | 1 | |
| 19 | HSS drill bits 0.8 mm | 3 | Small bits break easily |
| 20 | HSS drill bits 1.0 mm | 3 | |
| 21 | HSS drill bit 1.3 mm | 1 | |
| 22 | Utility knife + steel ruler | 1 | Score and snap the board |
| 23 | Small flat file or 240–400 grit sandpaper | 1 | Edges to the outline |
| 24 | Rosin flux (or rosin dissolved in IPA) | 1 | Protects the bare copper |
| 25 | Dust mask | 1 | Drilling FR-2 |
| 26 | Hair dryer, paper towels, timer | — | You probably have these |
| 27 | **Acetone** (nail-polish remover, pure) | 1 small bottle | Removes the leftover resist after etching |

## Related

[[Wearable PCB UV Etching Plan]] · [[Beacon Node Perfboard Build]] · [[Work Log]]
