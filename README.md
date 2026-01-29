# KXUSBC2 – Internal USB-C charger for the Elecraft KX2

## Introduction

Have you ever forgotten to bring your KX2 charger on a trip, accidentally torn the speaker wires after countless battery removals, or found yourself with a dead phone battery on a summit while the KX2 still had plenty of power? I’ve managed all three. Each time, I wished the KX2 simply had a USB-C port — no more removing the battery, no special charger to pack, and the ability to top up a phone.

External power banks are awkward when operating handheld with the AX1 and may cause QRM. The KXIBC2 option still requires a specific AC adapter, charges very slowly, and cannot supply power to a phone. Perhaps the best solution until now was to bypass the KX2's built-in reverse-power diodes and connect an external USB-C charger. But with all of these solutions, you can forget something at home that you can’t buy on the go.

I prefer fully integrated things that are simple and foolproof to use. So I set out to design an option PCB that installs in place of a KXIBC2 or KXIO2 and adds a bidirectional (dual-role) USB-C port for charging and discharging the internal battery. In homage to Elecraft’s naming convention for KX2 options, I call it the **KXUSBC2** — an unofficial option.

<img src="/hardware/photos/pcb_top.jpg" alt="PCB top" width="500">
<img src="/hardware/photos/pcb_bottom.jpg" alt="PCB bottom" width="500">

Here is how it looks installed in a KX2, with a custom CNC-machined aluminum side plate for the USB-C port opening:

<img src="/hardware/photos/side_panel.jpg" alt="KX2 replacement side panel with USB-C port" width="500">

<img src="/hardware/photos/installed_side.jpg" alt="KXUSBC2 installed, side view" width="500">

<img src="/hardware/photos/installed_top.jpg" alt="KXUSBC2 installed, top view" width="500">


## Features

* Adds a bidirectional USB-C charging port to the KX2
* Charges the internal 3S Li-Ion battery at up to 30 W
* Dual-Role Port (DRP/OTG): Can also charge an external device (phone, GPS, HT etc.) through the same USB-C port at up to 30 W (5…15 V)
* Dual input: can charge from USB-C or DC jack
* Supports PD 3.0, QC, BC1.2
* Real-Time Clock (RTC)
* RGB status LED and config button
* Battery temperature monitoring (with thermistor, optional)
* Battery voltage monitor in KX2 menu (like KXIBC2)


## Tech details

* BQ25792 buck-boost battery charger IC
  * 1.5 MHz switching frequency
  * Quad external power MOSFETs for input switching
* FUSB302B USB-C controller
* ATtiny3226 microcontroller
  * Implements the PD protocol stack in firmware
  * Current/voltage limits etc. configurable in EEPROM
  * Config button for basic settings, trigger a PD role swap, reset
  * UPDI debug/programming header
  * Serial debug console header
* RTC emulated in MCU (SPI client), backed by crystal, with temperature compensation
* ~60 µA standby current
* 4-layer PCB
  * Components on both sides (min. 0402)
* Replacement aluminum side panel, CNC milled, anodized and silkscreen printed, with USB-C and button pin hole

For more information and a PDF schematic, see the [hardware notes](hardware/README.md).


## Installation

Installing the KXUSBC2 is quite simple, and similar to the procedure for the KXIBC2. See the [User Guide](USER_GUIDE.md) for details.


## Firmware updates and configuration

There is a web-based programmer at https://manuelkasper.github.io/kxusbc2/programmer/ that can flash firmware updates and allows easy UI-based configuration of the various settings (current limits etc.). All that is required is a simple UPDI adapter (essentially a USB-to-Serial TTL level adapter) and a browser that supports the Web Serial API.


## Development

The schematic/PCB was designed with KiCad, and the firmware was written to be compiled with AVR-GCC. See the [hardware notes](hardware/README.md) and [firmware notes](firmware/README.md) for details.


## Current state of the project

The PCB has gone through three revisions and is now at rev3, which is considered to be production-ready. rev2 boards have been tested by seven beta testers around the world, and all have worked on first try. The firmware is considered to be complete. See the issues page for any open issues or ideas for future revisions.


### Disclaimer

You are using the KXUSBC2 at your own risk; I won't take responsibility if your KX2, phone, charger, battery, etc. get fried due to this board, your house burns down, or if you unexpectedly end up with an empty battery. You might lose your warranty on the KX2 by using this board.

Elecraft ® is a registered trademark of Elecraft, Inc. This project is not affiliated with or endorsed by Elecraft.


### License

© 2025-2026 Manuel Kasper HB9DQM.

This source describes Open Hardware and is licensed under the CERN-OHL-W v2.

You may redistribute and modify this documentation and make products using it under the terms of the CERN-OHL-W v2 (https:/cern.ch/cern-ohl). This documentation is distributed WITHOUT ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING OF MERCHANTABILITY, SATISFACTORY QUALITY AND FITNESS FOR A PARTICULAR PURPOSE. Please see the CERN-OHL-W v2 for applicable conditions.

Source location: https://github.com/manuelkasper/kxusbc2
