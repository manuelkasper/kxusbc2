# Troubleshooting

??? failure "LED blinks red continuously (5 Hz)"
    - Over-voltage or over-current fault detected
    - Check power source specifications
    - Verify battery connections

??? failure "LED blinks red continuously (2 Hz) during OTG"
    - Battery voltage too low for discharging
    - Recharge the battery

??? question "Charging doesn't start"
    - Check that power source supports USB PD, QC, or BC1.2
    - Ensure KX2 is powered off (if charging while on is disabled)

??? question "OTG mode doesn't work"
    - Ensure battery voltage is above the discharge limit (default 9.0 V)
    - Try disconnecting and reconnecting the device
    - Check that the connected device can accept USB-C power input

??? question "Battery voltage not showing in KX2 menu"
    - Set "KXIBC2" option to "NOR" in KX2 configuration menu

??? question "QRM concerns"
    - QRM is minimal (typically S1 noise floor increase)
    - No QRM when USB/DC is disconnected
    - Charging is automatically disabled when KX2 is on (by default)
    - Can be enabled in configuration if needed

## Technical specifications

| | |
|---|---|
| **Charger IC** | BQ25792 buck-boost converter |
| **USB-C controller** | FUSB302B |
| **Microcontroller** | ATtiny3226 |
| **Switching frequency** | 1.5 MHz |
| **Standby current** | ~60 µA |
| **Supported protocols** | USB PD 3.0, QC, BC1.2 |
| **Battery types** | 3S Li-Ion (default), 4S LiFePO₄ (with configuration) |

## Safety notes

!!! danger "Use at your own risk"
    - Always use batteries with built-in protection and balancing circuits
    - The KXUSBC2 is an unofficial modification and may void your KX2 warranty
    - Ensure proper grounding through the side panel mounting

## Support and resources

- [Project repository](https://github.com/manuelkasper/kxusbc2)
- [Hardware schematic](../technical_notes/hardware.md)
- [Firmware details](../technical_notes/firmware.md)
- [KXIBC2 manual (for reference)](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf)
