# KXUSBC2 User Guide

## Part 1: Installation Guide

### Prerequisites

Before installing the KXUSBC2, ensure you have:

- An Elecraft KX2 transceiver
- A 3S (12.6 V) internal Li-Ion battery (or 4S LiFePO₄ with firmware configuration)
- Basic soldering skills and equipment
- A replacement left side panel with USB-C opening
- Two wires (22-24 AWG) for power connections
- Optional: Mill-Max receptacle pins (8827-0-15-15-16-27-04-0) and mating pins (3132-0-00-15-00-00-08-0) if your KX2 doesn't already have a factory-installed KXIBC2

### Hardware Installation

1. **Open the KX2**
   - Remove the back cover to access the internal components.

2. **Remove the left side panel**
   - Unscrew the 4 screws holding the original left side panel. Make note of which screw goes where: the screws that hold the KXUSBC2 in place are longer and use a finer thread.

[TBD: add instructions on how to solder and place thermistor before installation, if desired]

3. **Install the KXUSBC2 board**
   - Plug the KXUSBC2 into the slot reserved for KXIBC2/KXIO2 options.
   - Ensure the board is properly seated.

4. **Connect power wires**
   - If your KX2 has a factory-installed KXIBC2, you can use the existing pin sockets (no soldering required)
   - Otherwise, solder two wires from the KX2 RF PCB to the KXUSBC2:
     - Connect the **E pad** on the KX2 RF PCB to the KXUSBC2 (external DC jack connection)
     - Connect the **B pad** on the KX2 RF PCB to the KXUSBC2 (battery connection)
     Trim the wires on the bottom of the board very close to the board after soldering, to prevent them from shorting against the side panel once installed.
   - Recommended wire lengths: E pad 28 mm, B pad 40 mm
   - Refer to the [KXIBC2 manual](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf) for detailed soldering instructions

5. **Install the replacement side panel**
   - Using sanding paper or a Dremel tool, strip the coating on the back of the replacement side panel in the areas where the side panel contacts raw metal parts of the KX2 chassis. Look at the original side panel for reference. Also remove the coating around the holes for the screws that go into the KXUSBC2, so that the metal standoffs on the KXUSBC2 make direct contact with the side panel for optimal grounding.
   - Mount the replacement left side panel with USB-C port opening (4 screws).
   - Ensure the USB-C connector aligns properly with the opening.

6. **Enable KXIBC2 option in KX2 menu**
   - Turn on the KX2 and go into the settings menu.
   - Find the KXIBC2 option and set it to "nor".
   - This will enable the RTC and battery voltage display functions.

---

## Part 2: User Guide

### Basic Operation

The KXUSBC2 adds a bidirectional USB-C port to your KX2, allowing you to:
- Charge the KX2's internal battery from any USB-C power source
- Charge external devices (phones, tablets, etc.) from the KX2's battery (OTG mode)

You can also charge from a 9-15 V supply connected to the KX2's external DC jack.

### Charging the KX2 Battery

1. **Connect a USB-C power source**
   - Use any USB-C charger, power bank, or computer USB port
   - Supports USB PD 3.0, QC, and BC1.2 protocols
   - Maximum charging power: 30 W

2. **Charging behavior**
   - The board automatically negotiates the best available voltage/current profile
   - Delay of 3 seconds for non-PD capable sources before charging begins
   - Default charging current: 3 A (configurable)
   - Charging voltage: 12.6 V for 3S Li-Ion (configurable for other battery types)
   - The charger uses either USB-C or the DC jack input, whichever is connected first
   - If both are connected at startup, DC jack takes priority

3. **Charging while operating**
   - By default, charging is inhibited when the KX2 is powered on (to avoid any chance of QRM)
   - This can be enabled in firmware configuration if desired

### Using OTG Mode (On-The-Go = Charging External Devices)

1. **Enable OTG mode**
   - Connect a USB-C device (phone, tablet, GPS, etc.) to the port
   - The board will automatically detect and switch to source mode

2. **Power output**
   - Maximum output: 30 W (5-15 V)
   - Default current limit: 3 A (configurable)
   - Minimum battery voltage: 9.0 V (configurable, prevents over-discharge)

3. **Low battery protection**
   - If battery voltage drops below the limit, discharging stops
   - LED will blink red (2 Hz)
   - Recharge the battery before OTG mode will work again

### LED Status Indicators

The RGB LED provides visual feedback on the board's status:

| State | Color | Pattern |
|-------|-------|---------|
| Disconnected | Off | - |
| Negotiating PD | Green/Yellow (*) | Blinking 5 Hz |
| Charging | Green/Yellow (*) | "Breathing" (speed indicates current) |
| Fully charged | Green | Steady |
| Temperature warning | Red | Steady |
| Fault (over-voltage/current) | Red | Blinking 5 Hz |
| Fault (low battery in OTG) | Red | Blinking 2 Hz |
| Fault (charger init) | Red | 3 blinks at 2 Hz, then pause |
| Fault (EEPROM) | Red | 4 blinks at 2 Hz, then pause |
| Rig on (charging inhibited) | Magenta | Steady |
| Discharging (OTG) | Blue/Cyan (*) | "Breathing" (speed indicates current) |

*Yellow/Cyan indicates temperature in "warm" or "cool" region (reduced current)

**Breathing speed indicates charge/discharge current:**
- < 500 mA: 8.5 s cycle
- 500-999 mA: 2.5 s cycle
- 1000-1999 mA: 1.2 s cycle
- ≥ 2000 mA: 0.8 s cycle

### Battery Voltage Monitoring

The KX2 can display the battery voltage in the menu (like with KXIBC2):
- Set the "KXIBC2" menu option to "NOR" in the KX2 configuration
- The battery voltage will appear as "VBAT" in the KX2 menu (with KX2 Firmware 3.02 as "BT")

### Real-Time Clock (RTC)

The KXUSBC2 includes an RTC that works with the KX2's clock functions:
- Automatically temperature-compensated
- Calibrate using the KX2's "RTC ADJ" menu as usual
- Maximum correction: ±127 ppm (about 11 seconds per day)

### Configuration Options

Advanced settings can be configured via EEPROM (requires UPDI programming tool):

- **Role**: SRC, SNK, DRP (default), TRY_SRC, TRY_SNK
- **PD mode**: Off, PD 2.0, PD 3.0 (default)
- **Charging current limit**: 50-5000 mA (default: 3000 mA)
- **Charging voltage limit**: 10000-18800 mV (default: 12600 mV for 3S Li-Ion)
- **DC input current limit**: 100-3300 mA (default: 3000 mA)
- **OTG current limit**: 120-3320 mA (default: 3000 mA)
- **Discharging voltage limit**: Minimum battery voltage for OTG (default: 9000 mV)
- **OTG voltage headroom**: 0-500 mV (default: 100 mV)
- **Allow charging while rig is on**: Boolean (default: false)
- **Enable thermistor**: Boolean (default: false)
- **User RTC offset**: -127 to +127 ppm (default: 0)

For 4S LiFePO₄ batteries, adjust the charging voltage limit to approximately 14.2 V (stay below the BMS cutoff to avoid over-voltage faults).

### Troubleshooting

**LED blinks red continuously (5 Hz)**
- Over-voltage or over-current fault detected
- Check power source specifications
- Verify battery connections

**LED blinks red continuously (2 Hz) during OTG**
- Battery voltage too low for discharging
- Recharge the battery

**Charging doesn't start**
- Check that power source supports USB PD, QC, or BC1.2
- Ensure KX2 is powered off (if charging while on is disabled)

**OTG mode doesn't work**
- Ensure battery voltage is above the discharge limit (default 9.0 V)
- Try disconnecting and reconnecting the device
- Check that the connected device can accept USB-C power input

**Battery voltage not showing in KX2 menu**
- Set "KXIBC2" option to "NOR" in KX2 configuration menu

**QRM concerns**
- QRM is minimal (typically S1 noise floor increase)
- No QRM when USB/DC is disconnected
- Charging is automatically disabled when KX2 is on (by default)
- Can be enabled in configuration if needed

### Technical Specifications

- **Charger IC**: BQ25792 buck-boost converter
- **USB-C controller**: FUSB302B
- **Microcontroller**: ATtiny3226
- **Switching frequency**: 1.5 MHz
- **Standby current**: ~60 µA
- **Supported protocols**: USB PD 3.0, QC, BC1.2
- **Battery types**: 3S Li-Ion (default), 4S LiFePO₄ (with configuration)

### Safety Notes

- Always use batteries with built-in protection and balancing circuits
- The KXUSBC2 is an unofficial modification and may void your KX2 warranty
- Use at your own risk
- Ensure proper grounding through the side panel mounting

### Support and Resources

- Project repository: https://github.com/manuelkasper/kxusbc2
- Hardware schematic: See `hardware/README.md`
- Firmware details: See `firmware/README.md`
- KXIBC2 manual (for reference): https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf

---

**Disclaimer**: This is an unofficial modification. Elecraft ® is a registered trademark of Elecraft, Inc. This project is not affiliated with or endorsed by Elecraft.

