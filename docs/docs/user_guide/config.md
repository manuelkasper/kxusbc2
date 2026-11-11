# Config Button & Settings

The KXUSBC2 has a small push button that can be accessed using a paper clip etc. through the side panel.

## Button press functions

| Press | Duration | Action |
|---|---|---|
| Short | < 1 second | Attempt a PD role swap — useful for charging from devices that can also act as a power source (e.g., recent iPhones) |
| Medium | 1–3 seconds | Enter the config menu — only works when nothing is connected to the KXUSBC2 (LED is off) |
| Long | > 3 seconds | System reset — restarts the KXUSBC2 |

## Navigating the config menu

When you enter the config menu, the LED blinks yellow at 1-second intervals. The number of blinks indicates which menu item you're currently viewing.

1. **Short press** — advance to the next menu item
2. **Medium press** — enter the currently selected menu item (LED blinks blue to show the current setting)
      - **Short press** changes the setting
      - **Medium press** exits the menu item
3. **Long press** — exit the menu and restart with new settings

### Menu items

| # | Menu item | Available values (blink counts) |
|:---|:------------|:-----------------|
| 1 | Charging current limit | 500 mA (1), 1000 mA (2), 2000 mA (3 :material-star:), 3000 mA (4) |
| 2 | DC input current limit | 500 mA (1), 1000 mA (2), 2000 mA (3), 3000 mA (4 :material-star:) |
| 3 | Charge while rig is on | Disable (1 :material-star:), Enable (2) |
| 4 | Thermistor | Disable (1 :material-star:), Enable (2) |

:material-star: = default setting

??? example "Walkthrough: enable charging while the rig is on"
    1. Press the button for 1–3 seconds (LED blinks yellow, indicating menu item 1)
    2. Press the button briefly two times to reach menu item 3 (LED will blink 3 times before cycling)
    3. Press the button for 1–3 seconds to enter menu item 3 (LED blinks blue once, indicating that the setting is currently disabled)
    4. Press the button briefly to toggle to "enable" (two blinks)
    5. Press the button for 1–3 seconds to exit the menu item
    6. Press the button for > 3 seconds to restart

## Configuration options

Advanced settings can be configured via EEPROM, using the [web-based programmer](../technical_notes/programmer.md) — no software installation required (just a simple serial UPDI programming adapter).

| Setting | Range | Default |
|---|---|---|
| Role | SRC, SNK, DRP, TRY_SRC, TRY_SNK | DRP |
| PD mode | Off, PD 2.0, PD 3.0 | PD 3.0 |
| Charging current limit | 50–5000 mA | 2000 mA |
| Charging voltage limit | 10000–18800 mV | 12600 mV (3S Li-Ion) |
| DC input current limit | 100–3300 mA | 3000 mA |
| OTG current limit | 120–3320 mA | 3000 mA |
| Discharging voltage limit | minimum battery voltage for OTG | 9000 mV |
| OTG voltage headroom | 0–500 mV | 100 mV |
| Allow charging while rig is on | boolean | false |
| Enable thermistor | boolean | false |
| User RTC offset | -127 to +127 ppm | 0 |

!!! tip "4S LiFePO₄ batteries"
    Adjust the charging voltage limit to approximately 14.2 V — stay below the BMS cutoff to avoid over-voltage faults.
