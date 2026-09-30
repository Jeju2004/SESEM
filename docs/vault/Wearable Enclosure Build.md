---
title: Wearable Enclosure Build
tags: [enclosure, 3d-print, wearable, build, sesem]
updated: 2026-09-30 (Rev B - +5 mm height, snap-hook lid, sliding belt clip, charge-light window, rounded edges)
---

# Wearable enclosure: print and assembly (Rev B)

A belt-worn case for the Rev C3 wearable. It has a **power compartment** under the PCB for:
- the Li-Po cell (50 × 33 × 5 mm);
- the TP4056;
- the MT3608.

- **Outside size:** 74 × 74 × **45.8 mm**.
  - Rev A was 37.8 mm. Rev B adds 5 mm for the wiring and 3 mm for the belt-clip rail.
- **Model:** parametric, in Blender 4.5: `trodes_wearable_enclosure_revB.py`.
  - Every size is a named number at the top of the script.
  - To rebuild, run: `blender -b --python trodes_wearable_enclosure_revB.py -- out_revB`
  - To pack the print plate, run: `python make_plate_revB.py .`
- **Checked by the script:**
  - All five parts are closed and manifold (0 open edges).
  - **31 part-to-part and part-to-component pairs overlap by 0 mm³.** The collision check itself was tested on a known 100 mm³ overlap.
- **Rev A** (`trodes_wearable_enclosure.py`, `out/`, the Fusion script) is kept for reference. **Its lid and base do not fit Rev B parts.**

## What changed from Rev A (team requests, 30 Sep)

| Request | Rev B |
|---|---|
| Lid sits 5 mm above the latch: the power-module wiring pushed the PCB up | **+5 mm height** (`WIRE_RISE = 5.0`). The PCB posts are 7.5 mm tall (were 2.5). The shelf is **open over the TP4056 and MT3608**, so the wiring can rise into the 7.5 mm space under the PCB instead of lifting the shelf. |
| Latch like the sketch | **Four snap hooks** on the lid (two per side) click into **windows in the side walls**. They replace the old bump-and-groove snap. |
| ESP32 USB-C opening must follow the raised board | Raised 5 mm with the PCB, and made **15 × 11 mm** (was 15 × 9). That gives ±1 mm for build-to-build variation in board height. |
| Show the TP4056 charging light | **Charge-light window** (12 × 5.8 mm) in the left wall, 1.5 mm above the charging port. It looks straight onto the TP4056 through the open shelf. |
| Round off sharp corners (elderly wearers) | Rounded corners and edges (below). |
| Keep the heart-rate, SOS and LED D2 hole spacing | **Unchanged.** Same centres and sizes. Only their edges are softened. |
| Do not move the switch | **Unchanged.** Same hole (6.4 mm), same place, same height. |
| Belt module slides into the body (like a fan's control module) | **Dovetail rail and detent.** The clip slides up into a channel on the back and clicks into place. No screws. |

**Rounded corners and edges:**
- R4 outside corners.
- The lid's top edge is rounded (R1.6). It ends in a 45° bevel at the bed, so it prints without drooping.
- 0.5 mm seam bevel; 1 mm bottom bevel.
- Chamfers on the SOS (0.8 mm) and LED (0.6 mm) holes.
- The finger window has R2 corners and a 0.5 mm chamfer into the dish.
- The vents have round ends; every wall opening has R0.5–R1.5 corners.
- Belt clip: R4 at the tongue tip and at the plate corners, and a rounded tongue end.

## Parts (`out_revB/`)

| File | Print orientation | Solid volume |
|---|---|---|
| `Wearable_Base_RevB.stl` | Back (rail channel) down, as exported | 47.1 cm³ |
| `Wearable_Shelf_RevB.stl` | Plate down, posts up | 5.5 cm³ |
| `Wearable_Lid_RevB_print_upside_down.stl` | Already flipped: outer face on the bed, hooks up | 11.2 cm³ |
| `Wearable_SOS_Plunger_RevB.stl` | Already flipped: button face on the bed | 0.55 cm³. Same as Rev A plus a 0.5 mm edge chamfer, so the old plunger still fits. |
| `Wearable_BeltClip_RevB_print_standing.stl` | Already turned: **stands on its top end**, 70.5 mm tall | 15.5 cm³ |

**Reprint:**
- base, lid, shelf and belt clip;
- **not** the plunger (the old one fits).

The five parts fit on one A1 plate: **`TroDes_Wearable_RevB_A1_plate.3mf`**.

![[RevB_Closed.png]]

![[RevB_Exploded.png]]

## Print settings (Bambu Lab A1, PETG, Bambu Studio)

- These are the same as Rev A:
  - open the 3MF, load the geometry only;
  - *Bambu Lab A1 0.4 nozzle*, *Generic PETG*, *0.20 mm Standard*;
  - Textured PEI;
  - 3 walls, 15–20 % gyroid;
  - **supports off**; don't rotate the parts.
- **Brim:**
  - **belt clip: 8–10 mm.** It stands 70 mm tall on a 34 × 8 mm end.
  - Nothing else needs one.
- **Estimate:** about 65–75 g of PETG and 6–7 h. The slicer gives the real figure.
- **Overhangs:**
  - The lid hooks' catch face (1 mm) and the rail channel's roof (21 mm bridge) print without support.
  - If the channel roof sags, the clip will feel tight. Turn on *bridge* cooling (default on), or sand the rail top lightly.
- **Fit check:** print the **lid and base first** and try the snap.
  - **Too tight:** lower `BARB` from 1.0 to 0.8 mm.
  - **Too loose:** raise it to 1.2 mm. It's one number in the script.
- **Clip too tight:** raise `DT_CLR` (0.3 mm).

## How the lid latches (the team's sketch)

![[RevB_Section_Latch.png]]

Each hook is a 1.5 mm × 8 mm arm, 13 mm long, hanging from the lid 0.3 mm inside the wall.
- **The barb:** it has a 2 mm lead-in ramp and sticks out 1.0 mm.
- **Closing:** press the lid down. The ramps flex the arms 0.7 mm inward, then the barbs snap into the wall windows.
  - The strain is about 1.4 %, well inside PETG's range for repeated use.
- **Holding:** the flat top of each barb stops the lid from lifting.
- **Where the hooks are:**
  - left wall: v = 26 and 48 mm;
  - right wall: v = 18 and 53 mm.
  - They clear C1, C3, the ESP32 USB-C opening and the fuel gauge.
- **To open:**
  1. Push the two barbs on one side inward through their windows. Use two toothpicks or a bent paperclip.
  2. Lift that side at the pry notch on the top edge.
  3. Repeat on the other side.
- The windows are recessed 1.3 mm behind the outer surface, with rounded corners, so nothing sharp sticks out.

![[RevB_Section_Full.png]]

## Belt clip: slide in, click, done

![[RevB_Back_ClipSliding.png]]

- **Worn with the top edge up:**
  - the finger window at the top left, "TroDes" reading upright;
  - the charging port and charge light on the left;
  - the switch on the right.
- **The channel:** a **60° dovetail channel** runs up the back.
  - It is 18 mm wide at the surface and 21 mm inside, 2.6 mm deep.
  - It is open at the bottom edge and closed at the top by a 45° stop.
- **To attach:**
  1. Hook the clip on the belt.
  2. Hold the wearable above it and slide it **down onto the rail** (the rail goes into the channel from the bottom edge) until it stops.
  3. The rail's last 14 mm is a flexible finger with a bump. It **clicks** into a groove in the channel roof.
- **Holding:** the wearable's weight holds it against the top stop. The detent stops it riding up when the wearer sits or bends.
- **To remove:** pull the wearable up off the clip firmly. The detent has 45° faces, so it releases without a tool. A hard upward tug on the wearable also releases it.
- **Belt loop:** a 4.5 mm gap for belts up to about 4 mm thick and 50 mm wide. It has a grip ridge near the tip.

![[RevB_Back_ClipLatched.png]]

## Charge light

![[RevB_Left_ChargeLight.png]]

- **Where:** the window sits just above the charging port.
- **What it shows:** through the open shelf it looks straight onto the TP4056: **red = charging, blue = full**.
- **Optional diffuser:** fill the window with a blob of **clear hot glue** (or UV resin). This keeps dust out and makes the light glow evenly.
- **If you can't see the module's LEDs:** they're under the wires, so route the J1 leads toward the front channel.

## Allowances (checked 30 Sep)

| Where | Allowance |
|---|---|
| ESP32 on 5 mm headers + heatsink → lid underside | 1.8 mm (as Rev A) |
| Snap-hook barb in its wall window | 0.3 mm at the sides; 0.1 mm lift before it catches |
| Hook arm → ESP32 devkit edge while flexing | 1.0 mm (left side, the tightest) |
| ESP32 USB-C plug overmold (12.35 × 6.5) in the 15 × 11 opening | 1.3 mm at each side, 2.25 mm top and bottom |
| Belt-clip rail in the dovetail | 0.3 mm on the flanks, 0.35 mm at the roof, 0.4 mm plate to back |
| Detent bump in its groove | 0.6 mm engagement; the finger flexes 0.6 mm (about 1.6 % strain) |
| Shelf to wall / PCB to wall / lid lip to wall | 0.4 / 0.5 / 0.3 mm per side (as Rev A) |
| Toggle bushing (6 mm) | 6.4 mm hole, unchanged |

## Heights the case was built for

| Part | Height used |
|---|---|
| **Wiring under the PCB** | **`WIRE_RISE = 5.0 mm`** (measured by the team 30 Sep). If the board ends up at a different height, change this number and rebuild. The lid, hooks, windows and USB-C opening all follow it. |
| Female headers / stackable header / SW2 / heatsink / C1, C3 / D2 | As Rev A: 5 / 8.5 / 13 / top ≤ 17.2 above PCB / ≤ 13 / D2 base about 13 mm above the board |

## Assembly order

1. **Set the MT3608 to 5.0 V** on the bench before anything is connected to it. This is still the mandatory step.
2. **Power compartment:**
   - **battery**, on foam tape against its rim;
   - **TP4056**, its USB-C pushed up to the left-wall port, **LED side up**;
   - **MT3608**;
   - **toggle switch**, with its nut in the right wall.
   - Route the wires through the divider notches. They may now rise freely through the two shelf openings.
3. **Shelf:** drop it onto the ledges.
   - The open part over the TP4056 goes to the left wall. The centre strip with the post sits on the divider.
4. **PCB:**
   - Put foam tape on the six posts (7.5 mm tall now) and press the board down.
   - Solder J1 and J2 with the leads coming up through the shelf openings or the front channel.
5. **Modules:**
   - the ESP32, with USB toward the right-wall opening;
   - the fuel gauge;
   - the MAX30102 on its stackable header.
6. **Lid:**
   - Put the plunger in the SOS hole from inside.
   - Line up the lid's four hooks with the side-wall windows and press down until all four click.
7. **Belt clip:** slide the wearable down onto the clip until it clicks. No screws; the Rev A M3 screws are no longer used.

## Openings

| Opening | Where | Use |
|---|---|---|
| ESP32 USB-C | Right wall, upper (**15 × 11 mm**, raised 5 mm) | Programming |
| TP4056 USB-C | Left wall, bottom (13 × 8 mm, unchanged) | Charging |
| **Charge light** | Left wall, just above the charging port (12 × 5.8 mm) | Red = charging, blue = full |
| Toggle switch | Right wall, bottom (**unchanged**) | Power on/off |
| 4 latch windows | Side walls, about 10 mm below the top edge | Snap hooks; release with a toothpick |
| Pry notch | Top edge, centre | Lift the lid after releasing the hooks |
| Dovetail channel | Back, open at the bottom edge | Belt clip |
| Finger window and dish, SOS, LED, buzzer, vents | Lid (**same positions**) | As Rev A |

## Related

[[Enclosure Measurement Sheet]] · [[Wearable PCB UV Etching Plan]] · [[Shopping List 2026-09-27]] · [[Work Log]]
