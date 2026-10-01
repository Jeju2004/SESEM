# SESEM — Component List for Adviser Approval

*Smart Elderly Safety and Emergency Monitoring System with Geofencing (Indoor BLE-based localization) — Mapua University, BS ECE, Electronics Design*

**Note for the adviser:** two components below are cost-driven substitutions from the original design — the battery gauge changed from a MAX17048 fuel gauge IC to a simple voltage divider, and the regulator changed from an MCP1700 LDO to an AMS1117-3.3 module. Flagged below.

---

## 1. Wearable Device (worn by the resident)

- **ESP32-WROOM-32** — main MCU; BLE zone scanning + WiFi reporting
- **MAX30102** — heart rate sensor (I2C, skin contact)
- **Pushbutton** — SOS trigger; short press = alert, long press = dismiss
- **Piezo buzzer + NPN driver** — local audible alert
- **Bi-color LED** — power/alert status indicator
- **Voltage divider (2 resistors)** — battery level monitoring *(swapped from MAX17048 — cost)*
- **3.7V Li-Po battery (~1000mAh)** — power source
- **TP4056 module (USB-C)** — battery charging + protection
- **AMS1117-3.3 module** — voltage regulation *(swapped from MCP1700 — cost/availability)*
- **Pin header (TX/RX/EN/BOOT/3V3/GND)** — programming/debug

## 2. Fixed BLE Zone Beacons

- **ESP32 dev board (unmodified)** — one per zone; broadcasts BLE signal for localization; no custom PCB, USB-powered

## 3. Door Sensor Node (restricted-area doors)

- **ESP8266 NodeMCU V3** — door node MCU; reports door state over WiFi
- **Magnetic reed switch + magnet** — detects door open/close
- **5V USB adapter** — power source (mains, no battery)
- **LED** — power/network status indicator

## 4. PCB Fabrication Materials (self-etched, both boards)

- **Copper clad laminate (double-sided)** — PCB substrate
- **Ferric chloride etchant + supplies** (drill bits, isopropyl alcohol, sandpaper, transfer paper) — toner-transfer + etch process

---

## Adviser Approval

Reviewed and approved by:

Signature: ______________________________ &nbsp;&nbsp;&nbsp; Date: ______________

Name: __________________________________
