# KXUSBC2 User Guide

## Part 1: Installation Guide

### Prerequisites

Before installing the KXUSBC2, ensure you have:

- An Elecraft KX2 transceiver
- A 3S (12.6 V) internal Li-Ion battery (or 4S LiFePO₄ with firmware configuration)
- Basic soldering skills and equipment
- A replacement left side aluminum panel with USB-C opening
- Thermal pad (10 x 6 mm, 4 mm height)
- Heat shrink tube (2.5 x 15 mm)
- If your KX2 is older and doesn't have factory-installed receptacles on the B and E pads:
  - 2 pcs. Receptacle pins ([Mill-Max 8827-0-15-15-16-27-04-0](https://www.digikey.com/en/products/detail/mill-max-manufacturing-corp/8827-0-15-15-16-27-04-0/4440738)) <img src="/hardware/photos/8827-0-15-15-16-27-04-0.jpg" alt="Receptacle pin" width="60" style="vertical-align: middle">
- If the wires are not already installed on your KXUSBC2:
  - White/red silicone wires (22 AWG)
  - 2 pcs. Mating pins ([Mill-Max 3132-0-00-15-00-00-08-0](https://www.digikey.com/en/products/detail/mill-max-manufacturing-corp/3132-0-00-15-00-00-08-0/413214)) <img src="/hardware/photos/3132-0-00-15-00-00-08-0.jpg" alt="Mating pin" width="60" style="vertical-align: middle">
- If the metal standoffs are not already installed on your KXUSBC2:
  - 2 pcs. Standoff M2.5 3 mm height
    Würth Electronics 9774030151R
    DigiKey [732-7083-1-ND](https://www.digikey.com/en/products/detail/würth-elektronik/9774030151R/5320626)

### Preparing the KXUSBC2

#### Soldering the standoffs

If the standoffs on your KXUSBC2 aren't already soldered, do the following:

1. Place a standoff in one of the holes on the top (component) side.
2. Heat the standoff, and the area around it, with hot air at 200 °C for 30 seconds.
3. Quickly hold your soldering iron against the side of the standoff and the pad and apply solder around the standoff. Keep heating the standoff until the solder is evenly distributed and melted all around.
4. Remove soldering iron and let the solder joint cool down. The standoff should drop into place and center itself on its own.
5. Flip the board and inspect the bottom side. If not enough solder has migrated through the hole to solder the end of the standoff to the bottom pad, repeat steps 2-3 to solder the bottom as well. This serves to increase the mechanical strength. Be careful not to get solder inside the thread.

[add photo of top and bottom standoff solder detail]

#### Installing the wires

If the wires on your KXUSBC2 aren't already installed, do the following:

1. Cut ~50 mm pieces of white and red silicone wire.
2. Strip 3 mm of the insulation on one end of each wire.
3. Solder gold mating pins (those with the wider shoulder) to both wires.
4. Trim the wires such that the total length from the tip of the gold pin is as follows:
   * E (white): 31 mm
   * B (red): 43 mm
5. Strip 3 mm of the insulation from the open ends of the wires.
6. Solder the wires to the KXUSBC2 PCB. The wires enter the PCB on the bottom side and are soldered on the top side.
7. Trim the excess wires close to the board, to prevent shorts against the side panel.

<img src="/hardware/photos/pcb_wires.jpg" alt="PCB with wires" width="500">

#### Adding insulating tape

As the clearance to the back cover is very small, insulating tape (Kapton preferred) should be applied to the top edge of the PCB as follows:

[add photo of Kapton tape]


### Preparing the KX2

If you have a newer KX2 that already has pin receptacles on the B and E pads or have installed a KXIBC2 before, then you can skip this section.

Otherwise, perform the following step (see also the [KXIBC2 installation guide](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf), as the procedure is the same):

1. Solder the long, slim gold pin receptacles (Mill-Max 8827-0-15-15-16-27-04-0) to the E and B pads of the KX2 RF PCB. The E pad may be filled with solder, making this a bit difficult. Pre-heating with hot air and then using solder wick helps. One can remove the RF PCB in order to solder the pins properly on the bottom, but it can also be done in place on the top side.

<img src="/hardware/photos/kx2_rf_pcb/rf_pcb_jacks.jpg" alt="Receptacles on KX2 RF PCB" width="500">

### Preparing the side panel

Inspect your replacement side panel. The back side should have the black coating removed and bare metal exposed on those parts that make contact with metal parts of the KX2’s chassis – like on the original side panel. If not, then you will need to do that yourself to ensure proper grounding. A Dremel or similar power tool works best (use eye protection!). Hand sanding with sand paper can be tedious.

Make sure to also remove the coating around the screw holes near the edge, as the standoffs on the KXUSBC2 board make electrical contact there for grounding.

<img src="/hardware/photos/side_panel_back_original.jpg" alt="Backside of original side panel" width="500">

### Hardware Installation

1. **Open the KX2**
   - Remove the back cover to access the internal components.

2. **Remove the left side panel**
   - Unscrew the 4 screws holding the original left side panel. Make note of which screw goes where: the screws that hold the KXUSBC2 in place are longer and use a finer thread.

3. **Install the KXUSBC2 board**
   - Plug the KXUSBC2 into the slot reserved for KXIBC2/KXIO2 options.
   - Ensure the board is properly seated.

4. **Connect power wires**
   - Slip heat shrink tubing onto the red and white (optional) wires from the KXUSBC2.
   - Plug the wires into the receptacles on the KX2 RF PCB (E = white, B = red).
   - Slide the heat shrink tubing over the pins to prevent short-circuits (no need to shrink the tubing, and can in fact make it hard to remove if desired).
     
     <img src="/hardware/photos/wires_connected.jpg" alt="Wires connected to KX2" width="500">

5. **Place thermal pad**
   - Place the thermal pad over U1 as shown in the photo, such that it doesn't collide with the protrusion on the KX2's back cover. Remove the protective film on both sides before using.
     
     <img src="/hardware/photos/thermal_pad.jpg" alt="Thermal pad placement" width="500">

6. **Install the replacement side panel**
   - Make sure to use the right screws for the right holes, or you will damage the thread.

7. **Enable KXIBC2 option in KX2 menu**
   - Turn on the KX2 and go into the settings menu.
   - Find the KXIBC2 option and set it to "NOR".
   - This will enable the RTC and battery voltage display functions.
   - If you can't find the KXIBC2 option in the menu, you need to update the KX2 firmware.

---

## Part 2: User Guide

### Basic Operation

The KXUSBC2 adds a bidirectional USB-C port to your KX2, allowing you to:
- Charge the KX2's internal battery from any USB-C power source
- Charge external devices (phones, tablets, etc.) from the KX2's battery (OTG mode)

You can also charge from a 9-15 V supply connected to the KX2's external DC jack.

### Charging the KX2 Battery

#### Connect a power source
- Use any USB-C charger, power bank, or computer USB port
- Supports USB PD 3.0, QC, and BC1.2 protocols
- You can also connect a DC power supply (9-15 V) to the KX2's DC jack
- Maximum charging power: 30 W

#### Charging behavior
- The board automatically negotiates the best available voltage/current profile
- Delay of 3 seconds for non-PD capable sources before charging begins
- Default charging current: 3 A (configurable)
- Charging voltage: 12.6 V for 3S Li-Ion (configurable for other battery types)
- The charger uses either USB-C or the DC jack input, whichever is connected first

#### Charging while operating
- By default, charging is inhibited when the KX2 is powered on (to avoid any chance of QRM)
- This can be changed in firmware configuration if desired

### Using OTG/Source Mode (On-The-Go = Charging External Devices)

#### Starting OTG mode
- Connect a USB-C sink (phone, tablet, GPS, etc.) to the port
- The board will automatically detect and switch to source mode

#### Power output
- Maximum output: 30 W (5-15 V)
- Default current limit: 3 A (configurable)
- Minimum battery voltage: 9.0 V (configurable, prevents over-discharge)

#### Low battery protection
- If battery voltage drops below the limit, discharging stops
- LED will blink red (2 Hz)
- Recharge the battery before OTG mode will work again

### LED Status Indicators

The RGB LED provides visual feedback on the board's status:

| State | Color | Pattern |
|-------|-------|---------|
| Disconnected | Off | - |
| Negotiating PD | Green/Yellow (*) | Blinking 5 Hz |
| Charging | Green/Yellow (*) | Pulsing (frequency indicates current) |
| Fully charged | Green | Steady |
| Temperature warning | Red | Steady |
| Fault (over-voltage/current) | Red | Blinking 5 Hz |
| Fault (low battery in OTG) | Red | Blinking 2 Hz |
| Fault (charger init) | Red | 3 blinks at 2 Hz, then pause |
| Fault (EEPROM) | Red | 4 blinks at 2 Hz, then pause |
| Rig on (charging inhibited) | Magenta | Steady |
| Discharging (OTG) | Blue/Cyan (*) | Pulsing (frequency indicates current) |

(*) Yellow/Cyan indicates temperature in "warm" or "cool" region (reduced current)

**Pulsing frequency indicates charge/discharge current:**
- < 500 mA: 8.5 s cycle
- 500-999 mA: 2.5 s cycle
- 1000-1999 mA: 1.2 s cycle
- ≥ 2000 mA: 0.8 s cycle

### Battery Voltage Monitoring

The KX2 can display the battery voltage in the menu (like with KXIBC2):
- Set the "KXIBC2" menu option to "NOR" in the KX2 configuration
- The battery voltage will appear as "BT" in the KX2 VFO B display

### Real-Time Clock (RTC)

The KXUSBC2 includes an RTC that works with the KX2's clock functions:
- Automatically temperature-compensated
- Calibrate using the KX2's "RTC ADJ" menu as usual
- Maximum correction: ±127 ppm (about 11 seconds per day)

### Config Button

The KXUSBC2 has a small push button that can be accessed using a paper clip etc. through the side panel.

#### Button Press Functions

- **Short press** (< 1 second): Attempt a PD role swap
  - Useful for charging from devices that can also act as a power source (e.g., recent iPhones)
  
- **Medium press** (1–3 seconds): Enter the config menu
  - Only works when nothing is connected to the KXUSBC2 (LED is off)
  
- **Long press** (> 3 seconds): System reset
  - Restarts the KXUSBC2

#### Config Menu Navigation

When you enter the config menu, the LED blinks yellow at 1-second intervals. The number of blinks indicates which menu item you're currently viewing.

**Menu Navigation:**
- **Short press**: Advance to the next menu item
- **Medium press**: Enter the currently selected menu item (LED will blink blue to show the current setting)
  - While viewing settings:
    - **Short press** changes the setting
    - **Medium press** exits the menu item
- **Long press**: Exit the menu and restart with new settings

#### Config Menu Items

| Menu Item | Description | Available Values (blink counts) |
|:----------|:------------|:-----------------|
| 1 | Charging current limit | 500 mA (1), 1000 mA (2), 2000 mA (3), 3000 mA (4) |
| 2 | DC input current limit | 500 mA (1), 1000 mA (2), 2000 mA (3), 3000 mA (4) |
| 3 | Charge while rig is on | Disable (1), Enable (2) |
| 4 | Thermistor | Disable (1), Enable (2) |

**Example**: To enable charging while the rig is on:
1. Press the button for 1–3 seconds (LED blinks yellow, indicating menu item 1)
2. Press the button briefly two times to reach menu item 3 (LED will blink 3 times before cycling)
3. Press the button for 1–3 seconds to enter menu item 3 (LED blinks blue once, indicating that the setting is currently disabled)
4. Press the button briefly to toggle to "enable" (two blinks)
5. Press the button for 1–3 seconds to exit the menu item
6. Press the button for > 3 seconds to restart

### Configuration Options

Advanced settings can be configured via EEPROM. The web-based programmer at https://manuelkasper.github.io/kxusbc2/programmer can be used to easily change the settings without installing any software (requires a simple serial UPDI programming adapter).

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

