# KXUSBC2 – Internal USB-C charger for the Elecraft KX2

## Introduction

Have you ever forgotten to bring your KX2 charger on a trip, torn the speaker wires after countless battery removals, or found yourself with a dead phone battery on a summit while the KX2 still had plenty of power? I’ve managed all three. Each time, I wished the KX2 simply had a USB-C port — no more removing the battery, no special charger to pack, and the ability to top up a phone.

External power banks are awkward when operating handheld with the AX1 and may cause QRM. The KXIBC2 option still requires a specific AC adapter, charges very slowly, and cannot supply power to a phone. Perhaps the best solution until now was to bypass the KX2's built-in reverse-power diodes and connect an external USB-C charger. But with all of these solutions, you can forget something at home that you can’t buy on the go.

I prefer fully integrated things that are simple and foolproof to use. So I set out to design an option PCB that installs in place of a KXIBC2 or KXIO2 and adds a bidirectional (dual-role) USB-C port for charging and discharging the internal battery. In homage to Elecraft’s naming convention for KX2 options, I call it the **KXUSBC2** — an unofficial option.

<img src="/hardware/photos/pcb_top.jpg" alt="PCB top" width="500">
<img src="/hardware/photos/pcb_bottom.jpg" alt="PCB bottom" width="500">

The top side was assembled at the PCB factory, except for the receptacles and the metal standoffs. The bottom side was hand-soldered, as you can tell 😇

Here is how it looks installed in a KX2, with a custom CNC-machined aluminum side plate for the USB-C port opening:

<img src="/hardware/photos/side_panel.jpg" alt="KX2 replacement side panel with USB-C port" width="500">

<img src="/hardware/photos/installed_side.jpg" alt="KXUSBC2 installed, side view" width="500">

<img src="/hardware/photos/installed_top.jpg" alt="KXUSBC2 installed, top view" width="500">


## Features

* Adds a bidirectional USB-C charging port to the KX2
* Charges the internal 3S Li-Ion battery at up to 30 W
* Dual Role Port (DRP/OTG): Can also charge an external device (phone, GPS, HT etc.) through the same USB-C port at up to 30 W (5…15 V)
* Dual input: can charge from USB-C or DC jack
* Supports PD 3.0, QC, BC1.2
* Real-Time Clock (RTC)
* RGB status LED and config button
* Battery temperature monitoring (with thermistor, optional)
* Battery voltage monitor in KX2 menu (VBAT, like KXIBC2)

## Tech details

* BQ25792 buck-boost battery charger IC
  * 1.5 MHz switching frequency
  * Quad external power MOSFETs for input switching
* FUSB302B USB-C controller
* ATtiny3226 microcontroller
  * Implements the PD protocol stack in firmware
  * Current/voltage limits etc. configurable in EEPROM
  * Config button for basic settings (TBD), trigger a PD role swap, reset, etc.
  * UPDI debug/programming header
  * Serial debug console header
* RTC emulated in MCU (SPI client), backed by crystal, with temperature compensation
* ~100 µA standby current
* 4 layer PCB
  * Almost all components on top side (min. 0402)
  * Some capacitors and LED on bottom side (can be hand soldered, min. 0603)
* Replacement aluminum side panel, CNC milled, anodized and silkscreen printed, with USB-C and button pin hole

## Installation

Installing the KXUSBC2 is quite simple, and similar to the procedure for the KXIBC2.

* Open the back of the KX2.
* Remove the original left side panel (4 screws).
* Plug the KXUSBC2 into the slot reserved for the KXIBC2/KXIO2.
* Solder two wires from the E and B pads on the KX2 RF PCB to the KXUSBC2 (same procedure as for installing an official KXIBC2, see [manual](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf)). If you have a KX2 with a factory installed KXIBC2, there should already be two pin sockets in place that you can simply plug into, no soldering required.
* Install the replacement left side panel (4 screws).

Instead of using a replacement side panel, an oblong USB-C hole can also be drilled into the original side panel.

## Current state of the project

A first batch of PCBs has been produced and successfully tested by HB9DQM (2025-11-30). Some minor issues and potential improvements to the hardware have been found; see the issues page.

The firmware is working, with PD 3.0 compatibility tested with various sources (AC adapters, power banks) and sinks (mobile phones, tablets). Open tasks circle mainly around ensuring reliability in case of unexpected events (I²C timeouts/errors, watchdog etc.), implementing config button and LED handling, and further reducing standby power consumption. See the issues page for details.

### Disclaimer

You are using the KXUSBC2 on your own risk; I won't take responsibility if your KX2, phone, charger, battery etc. get fried due to this board, or if you unexpectedly end up with an empty battery. You might lose your warranty on the KX2 by using this board.

### License

[![CC BY-SA 4.0][cc-by-sa-shield]][cc-by-sa]

This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License][cc-by-sa].

[![CC BY-SA 4.0][cc-by-sa-image]][cc-by-sa]

[cc-by-sa]: http://creativecommons.org/licenses/by-sa/4.0/
[cc-by-sa-image]: https://licensebuttons.net/l/by-sa/4.0/88x31.png
[cc-by-sa-shield]: https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg
