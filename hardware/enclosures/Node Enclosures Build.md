---
title: Node Enclosures Build
tags: [enclosure, 3d-print, beacon, door-node, build, sesem]
updated: 2026-09-28 (room for an ESP32 heatsink; fit allowances; Bambu A1 plate file)
---

# Beacon and door-node enclosures: print and assembly

Snap-lid boxes for the three beacons (B1, B2, B3) and the door node (D11), each
built around a **5 × 7 cm perfboard** with the **ESP32 soldered directly**
(no female headers).

- **Model:** parametric, in Blender 4.5: `trodes_node_boxes.py`.
- **Outside size:** 55 × 75 × 26 mm per box (raised 2 mm on 28 Sep so an ESP32 **heatsink** fits).
- **Check:** all 8 STLs are closed and manifold (0 open edges).

![[Node_Enclosures_Closed.png]]

![[Node_Enclosures_Exploded.png]]

## Parts (`nodes_out/`)

| File | Print orientation |
|---|---|
| `Beacon_B1_Base.stl`, `Beacon_B2_Base.stl`, `Beacon_B3_Base.stl`, `DoorNode_D11_Base.stl` | Floor down, as exported |
| `Beacon_B1_Lid_print_upside_down.stl` (B2, B3, DoorNode_D11 the same) | Already flipped: outer face on the bed, hold-down pins pointing up |

**Engraved lids:**
- beacons: "B1 / BEDROOM WING", "B2 / DINING HALL", "B3 / MEDICINE ROOM";
- door node: "DOOR / MEDICINE ROOM";
- every lid also has "UP" at the antenna end and "TroDes".

## Print settings (Bambu Lab A1, PETG, Bambu Studio)

- **Easiest in Bambu Studio:** open **`TroDes_Nodes_A1_plate.3mf`** (File → Open). All 8 parts (4 bases, 4 lids) are already laid out on one A1 plate and oriented for printing.
  - If it asks, choose to load the **geometry only**.
  - Then pick the printer, filament and process below, and **Slice plate**.
- **Settings:** same as [[Wearable Enclosure Build]]: textured PEI, *Generic PETG*, 0.20 mm Standard, 3 walls, 15–20 % gyroid, **supports off**.
- **Plate:** all 8 parts fit on one A1 plate (4 bases in the back row, 4 lids in front). Roughly 85 g in total.
- **Test fit first:** print one base and one lid, then check that the board sits flat and the lid snaps on, before printing the rest.

## What's inside (heights the boxes are built for)

| Item | Where / height |
|---|---|
| Perfboard | Rests on 4 corner posts, 6 mm above the floor (the ESP32 pins stick out ~4.4 mm underneath) |
| ESP32 DevKitC | Soldered directly: columns 1 and 11, rows 4–22, antenna end at the "UP" end |
| ESP32 USB-C | Faces the **bottom wall opening** (**15 × 9 mm**), so the power cable comes out downwards |
| Beacon status LED | Column 15, rows 19–20. Solder the LED with its **base about 8 mm above the board**, so the dome sits in the lid hole |
| Door-node screw terminal J1 | Column 14, rows 12–14, at most ~10.5 mm tall. The reed cable enters through the **notch in the right wall** |
| Lid | 4 pins press the board's corners onto the posts, so no screws are needed |

## Allowances (checked 28 Sep)

| Where | Allowance |
|---|---|
| ESP32 module top → lid underside | 7.3 mm without a heatsink; **1.8 mm with a 5 mm heatsink** |
| Screw terminal J1 (~10.5 mm) → lid | 4.0 mm |
| USB-C plug overmold in the 15 × 9 opening | 1.3 mm each side |
| Board to wall | 0.5 mm per side; lid pins stop 0.3 mm above the board |
| Lid lip to wall | 0.3 mm per side; snap bump 0.7 mm into a 0.6 mm groove |

## Assembly

1. **Drop the board in** onto the 4 corner posts, with the USB-C port lined up with the bottom-wall opening.
2. **Door node only:**
   - lay the reed-switch cable into the right-wall notch;
   - screw its two wires into J1.
   - The lid's matching cut-out closes over the cable.
3. **Snap the lid on** (the "UP" end matches the antenna end). The bumps click into the side grooves.
4. **Plug in** the USB-C cable from the 5 V charger. The beacon LED should blink every 3 s.

## Mounting

- **Screw:**
  - Drive one pan-head wood screw (3.5–4 mm, head up to 7.5 mm) into the wall. Leave the head 2–3 mm out.
  - Put the box over it through the big keyhole and slide it down.
  - Each box has two keyholes, 34 mm apart, if you want two screws.
- **Or tape:** strong double-sided foam tape on the flat back.
- **Beacons:**
  - **1.2–1.5 m high, "UP" (antenna end) pointing up**;
  - all three mounted the same way;
  - at least 10 cm from metal.
- **Door node:** on the wall or frame beside the door, within reach of the reed-switch cable.

## To confirm (tell me if any differ; each is one number in the script)

- Perfboard exactly **50 × 70 mm** with 18 × 24 holes.
- The beacon ESP32s are **USB-C** like the wearable's.
- Reed switch cable up to **5 mm thick** (fits the 6 mm notch). An MC-38 wired door sensor is fine.
- **Screw terminal** no taller than ~10.5 mm.

## Related

[[Beacon Node Perfboard Build]] · [[Door Node Perfboard Layout]] · [[Wearable Enclosure Build]] · [[Work Log]]
