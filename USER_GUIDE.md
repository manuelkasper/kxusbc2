# KXUSBC2 User Guide

## Part 1: Installation Guide

### Prerequisites

**Required:**
- Elecraft KX2 transceiver
- 3S (12.6 V) Li-Ion battery (or 4S LiFePO₄ with firmware configuration)
- Replacement left side aluminum panel with USB-C opening
- Thermal pad (10 x 6 mm, 4 mm height)
- Heat shrink tube (2.5 x 15 mm)

**Optional (if not pre-installed):**
- 2 pcs. receptacle pins ([Mill-Max 8827-0-15-15-16-27-04-0](https://www.digikey.com/en/products/detail/mill-max-manufacturing-corp/8827-0-15-15-16-27-04-0/4440738)) – for older KX2 models without factory installed pins <img src="/hardware/photos/8827-0-15-15-16-27-04-0.jpg" alt="Receptacle pin" width="60" style="vertical-align: middle">
- 2 pcs. mating pins ([Mill-Max 3132-0-00-15-00-00-08-0](https://www.digikey.com/en/products/detail/mill-max-manufacturing-corp/3132-0-00-15-00-00-08-0/413214)) <img src="/hardware/photos/3132-0-00-15-00-00-08-0.jpg" alt="Mating pin" width="60" style="vertical-align: middle">
- 2 pcs. Standoff M2.5 3 mm height (Würth Electronics 9774030151R, [DigiKey 732-7083-1-ND](https://www.digikey.com/en/products/detail/würth-elektronik/9774030151R/5320626)) <img src="/hardware/photos/standoff.jpg" alt="Standoff" width="60" style="vertical-align: middle">
- White/red silicone wires (22 AWG), ~50 mm ea.

### Preparing the KXUSBC2

#### Soldering the standoffs

1. Place a standoff in a hole on the component side
2. Heat with hot air at 200 °C for 30 seconds
3. Hold soldering iron to the side of standoff and pad, and apply solder evenly around the standoff
4. Let cool and verify the standoff is centered
5. Inspect the bottom side; ideally some solder has migrated through the hole for mechanical strength

<img src="/hardware/photos/standoff_detail_top.jpg" alt="Standoff detail top" height="250">  
<img src="/hardware/photos/standoff_detail_bottom.jpg" alt="Standoff detail bottom" height="250">

#### Installing the wires

1. Cut ~50 mm pieces of white and red silicone wire
2. Strip 3 mm insulation on one end of each wire
3. Solder gold mating pins (those with the wide shoulder) to both wires
4. Trim to total length from pin tip:
   - E (white): 31 mm
   - B (red): 43 mm
5. Strip 3 mm from open ends and solder to KXUSBC2 PCB
6. Trim excess wire close to board to prevent shorts to side panel

<img src="/hardware/photos/pcb_wires.jpg" alt="PCB with wires" width="500">

#### Adding insulating tape

Apply insulating tape (Kapton preferred) to the top edge of the PCB to prevent shorts due to the small clearance to the back cover.

<img src="/hardware/photos/kapton_tape.jpg" alt="Kapton tape applied to PCB" width="500">


### Preparing the KX2

**Skip this section** if your KX2 already has receptacles on the B and E pads or you've installed a KXIBC2 before.

**Solder receptacles to KX2 RF PCB:**
- Solder long, slim gold pin receptacles (Mill-Max 8827-0-15-15-16-27-04-0) to the E and B pads
- If pads are filled with solder, pre-heat with hot air and use solder wick
- RF PCB can be removed for easier soldering on the bottom, or soldered in place

A simpler method (which makes removal more difficult, however) is not to install receptacles, but solder the pins from the KXUSBC2 directly to the B pad and the DC jack's center pin.

See the [KXIBC2 installation guide](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf) for a detailed explanation of both methods.

<img src="/hardware/photos/kx2_rf_pcb/rf_pcb_jacks.jpg" alt="Receptacles on KX2 RF PCB" width="500">


### Preparing the side panel

- Remove black coating from the back side to expose bare metal (where it contacts the KX2 chassis)
- Remove coating around screw holes near the edge (for grounding via standoffs)
- Use a Dremel or similar power tool (wear eye protection) for efficiency

<img src="/hardware/photos/side_panel_back_original.jpg" alt="Backside of original side panel" width="500">

### Hardware Installation

1. Remove the KX2 back cover
2. Unscrew the 4 screws from the left side panel (note: longer screws with finer thread hold the KXUSBC2)
3. Plug KXUSBC2 board into the KXIBC2/KXIO2 slot and ensure it's properly seated
4. Connect power wires:
   - Slide heat shrink tubing onto red and white (optional) wires
   - Plug into KX2 RF PCB receptacles (E = white, B = red)
   - Slide tubing over pins (no need to heat shrink)

     <img src="/hardware/photos/wires_connected.jpg" alt="Wires connected to KX2" width="500">
5. Place thermal pad over U1, shifted slightly to the right so as not to collide with the back cover (remove protective film from both sides first)
   
   <img src="/hardware/photos/thermal_pad.jpg" alt="Thermal pad placement" width="500">
7. Install the replacement side panel using correct screws for each hole
8. Enable KXIBC2 in KX2 menu:
   - Turn on KX2 and go to settings
   - Set KXIBC2 option to "NOR" (enables RTC and battery voltage display)
   - Update KX2 firmware if option is not present

#### Thermistor (optional)

A 10k NTC thermistor can optionally be connected between the marked pads (T and GND) on the backside of the board and attached to the battery pack with tape etc. The thermistor handling then needs to be enabled via the config button menu or the web based programmer (see below). It will reduce or inhibit charging/discharging if the battery temperature is too high or too low.

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

