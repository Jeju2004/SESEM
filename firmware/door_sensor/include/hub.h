// =============================================================================
// SESEMSG hub mode (build env esp32hub) - see src/hub.cpp
// =============================================================================
// The door node runs the whole system on its own: its own Wi-Fi network, the
// caregiver dashboard, the alert rules and the passcode, all in the ESP32. No
// laptop, no router, no internet. Plain door-node builds (env esp32dev,
// d1_mini) do not compile any of this.
#pragma once

#if HUB_MODE
void hubBegin();                    // Wi-Fi access point, DNS, web server, uplink
void hubLoop();                     // call every loop() pass; never blocks for long
void hubDoorEvent(const char *json);  // this node's own reed switch (buildEventJson)
bool hubUplinkUp();                 // joined the laptop's Wi-Fi (forwarding on)
#endif
