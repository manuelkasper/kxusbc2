# Installation

!!! tip "Already assembled?"
    If you have purchased a ready-made KXUSBC2 kit, the [hardware assembly](technical_notes/assembly.md) is already done for you — start here.

## Prerequisites

- Elecraft KX2 transceiver
- 3S (12.6 V) Li-Ion battery (or 4S LiFePO₄ with firmware configuration)
- KXUSBC2 board
- Replacement left side aluminum panel with USB-C opening
- Thermal pad (10 x 6 mm, 4 mm height)
- Heat shrink tube (2.5 x 15 mm)

??? note "Optional (if not pre-installed in KX2)"
    - 2 pcs. receptacle pins ([Mill-Max 8827-0-15-15-16-27-04-0](https://www.digikey.com/en/products/detail/mill-max-manufacturing-corp/8827-0-15-15-16-27-04-0/4440738)) <img src="/images/8827-0-15-15-16-27-04-0.jpg" alt="Receptacle pin" width="60" style="vertical-align: middle">

## Preparing the KX2

!!! info "Skip this section"
    Skip this section if your KX2 already has receptacles on the B and E pads (newer KX2, or if you've installed a KXIBC2 before).

Solder long, slim gold pin receptacles (Mill-Max 8827-0-15-15-16-27-04-0) to the E and B pads:

- If pads are filled with solder, pre-heat with hot air and use solder wick
- The RF PCB can be removed for easier soldering on the bottom, or soldered in place

A simpler method (which makes removal more difficult, however) is to skip the receptacles, and instead solder the pins from the KXUSBC2 directly to the B pad and the DC jack's center pin.

See the [KXIBC2 installation guide](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf) for a detailed explanation of both methods.

<img src="/images/kx2_rf_pcb/rf_pcb_jacks.jpg" alt="Receptacles on KX2 RF PCB" width="500">

## Hardware installation

1. Remove the KX2 back cover
2. Unplug and remove the battery
3. Unscrew the 4 screws from the left side panel — the longer screws with finer thread will hold the KXUSBC2
4. Connect the power wires:
      - Slide heat shrink tubing onto the red and white wires (optional on white)
      - Plug into the KX2 RF PCB receptacles (E = white, B = red)
      - Slide tubing over the pins (no need to heat shrink)

        <img src="/images/wires_connected.jpg" alt="Wires connected to KX2" width="500">

5. Plug the KXUSBC2 board into the KXIBC2/KXIO2 slot and ensure it's properly seated

    !!! warning "Don't force it"
        Bend the rear panel of the case slightly outwards to let the lens of the LED diffuser slide in. Do not force the board in, or you will break off the diffuser/LED. One of the four connectors at the bottom edge is not used.

    <img src="/images/installation_diffuser.jpg" alt="Installing the board by pushing the back of the case outwards" width="500">

6. Remove the protective film (if present) from both sides of the thermal pad, then place it over U1, shifted slightly to the right so as not to collide with the back cover

    <img src="/images/thermal_pad.jpg" alt="Thermal pad placement" width="500">

7. Install the replacement side panel using the correct screws for each hole
8. Reinstall the battery

    !!! danger "Important"
        The KXUSBC2 will not work without a battery connected.

9. Enable KXIBC2 in the KX2 menu:
      - Turn on the KX2 and go to settings
      - Set the KXIBC2 option to "NOR" (enables RTC and battery voltage display)
      - Update the KX2 firmware first if the option is not present

### Thermistor (optional)

A 10k NTC thermistor can optionally be connected between the marked pads (T and GND) on the backside of the board and attached to the battery pack with tape etc. It will reduce or inhibit charging/discharging if the battery temperature is too high or too low.

Enable thermistor handling via the [config button menu](user_guide/config.md) or the [web-based programmer](technical_notes/programmer.md).

---

Once installed, head to the [user guide](user_guide/index.md) to get started.
