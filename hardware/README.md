# Hardware notes

## PCB

### Specifications

* 4 layers
* FR-4
* 1 mm thickness
* all layers (including internal) have 1 oz copper

The design around the BQ25792 with its inductor and capacitors follows the guidelines given in the datasheet, and takes the EVM design as a basis. However, due to space constraints and the oblong shape, some compromises in the PCB layout had to be made: the BQ25792 has been rotated 180° relative to the reference design, making the switching nodes slightly longer and closer to other traces. Care was taken to keep them isolated from other traces by intermediate ground plane layers.


## Side panel

### Specifications

* Aluminum 6061
* Bead-blasted, hardcoat-anodized, and silkscreened


## Cost

Most of the parts are relatively low cost, and the board was designed so that it can be produced and assembled by low-cost services like JLCPCB (“Economic PCBA”), with almost all passive components from the “Basic” component selection, which doesn't incur component-loading fees. Only very few components are on the bottom side, and are big enough to be hand-soldered. Traces, via holes etc. are fairly large to avoid precision PCB costs.

The total BOM at qty. 10 is around $30/pc. (including PCB production and assembly of both sides), plus $12/pc. for the CNC milled, anodized and silkscreen printed side panel.


## Efficiency

<img src="illustrations/bq25792_efficiency.png" alt="Conversion efficiency" width="400">

The graph above is taken from the BQ25792's datasheet. I've done some casual measurements, both using the BQ25792's internal ADC and shunts, and with external power meters, and they agree with the data in the graph: around 95% when charging from 15 V input, and between 85% and 90% from 5 V (depending on the current). There seems to be no problem dissipating the maximum possible loss of around 3 W through the side panel (thermal pad placed between the IC and the panel), and in any case, the charger IC has thermal regulation and shutdown.


## Power connection to the KX2

Like the KXIBC2, the KXUSBC2 is intended to be wired to the “E” and “B” pads on the KX2 RFC PCB (under the battery) for connection to the external DC jack and the internal battery jack, respectively. Refer to the [KXIBC2 manual](https://ftp.elecraft.com/KX2/Manuals%20Downloads/E740370-B5,%20KXIBC2%20manual.pdf) for details.

Wire lengths, measured from the pad on the KXUSBC2 to the tip of the connector pin attached to the wire: E 28 mm, B 40 mm.

Receptacle pins for soldering to the KX2 PCB, probably also used by Elecraft for factory installation: Mill-Max 8827-0-15-15-16-27-04-0. Mating pin for crimping or soldering to wire: Mill-Max 3132-0-00-15-00-00-08-0 (for 22-24 AWG).

The PCB trace resistance between the “B” pad on the RF PCB and the central pin on the internal battery connector was measured to be around 5 mΩ (4T/Kelvin measurement). So although the pad/trace was probably not intended for this much current, it should have no problems handling 3 A.


## RTC
Some people like to use the clock provided by the KXIO2/KXIBC2 options for logging. The RTC chip that Elecraft uses (PCF2123) is obsolete, and the successors use a different register mapping that would require modifications to the KX2 firmware. As the MCU has spare capacity, I opted to use its internal RTC instead, emulating the few SPI commands that the KX2 uses to read/write the time in firmware. The RTC is clocked by a 32.768 kHz crystal, and the microcontroller consumes extremely little power for keeping the clock running.

The firmware automatically applies a temperature compensation, and one can also calibrate the clock using the KX2's "RTC ADJ" menu as usual.

Unlike the KXIO2/KXIBC2, the KXUSBC2 does not include a supercapacitor to keep the clock running during short power outages while swapping the battery. Having the KXUSBC2 installed means that most people probably won't need to swap out the battery anymore.

The KX2 uses an SPI frequency of 1 MHz (mode 0), and the delay between asserting RTC_CS (active high) and the beginning of the SPI transmission is about 10 µs.


## Battery monitoring
The KXUSBC2 includes a similar circuit to the one on the KXIBC2 that allows the KX2 to display the actual battery voltage in the menu. It works by dividing down the battery voltage and buffering it with an op-amp before passing it to the microcontroller in the KX2. The “KXIBC2” menu option must be set to “NOR” in the KX2's configuration menu for this to work.

Of course, the KXUSBC2 itself knows all voltages and currents flowing through it precisely, but it has no way to display those values on the KX2's display, as we cannot modify the firmware.


## QRM
A charger like this is somewhat akin to a 10 W PA amplifying a 1.5 MHz square wave into a low-pass filter. Having that right inside a sensitive HF rig, and even electrically connected to it, one might expect QRM mayhem. I thought so too, and thus the firmware can be set to automatically suspend charging while the KX2 is on, so one can still use an external power supply to power the KX2 while operating, without any QRM from the charger.

I did some lab testing with a dummy load connected to the KX2. Result: while charging the KX2 at 28 W from a 15 V PD source, I noticed that the noise floor increased from S0 to around S1 on 80-10m. The only really strong signal that I could find in amateur bands was the 9th harmonic of the switching frequency, which varied around 1.55 MHz and 1.58 MHz in my test (the charger IC uses an RC oscillator), resulting in S7 QRM in a range of about 10 kHz somewhere in the lower half of the 20m band. Results in reverse mode (charging an iPad at 28 W) were similar.

Not wanting my concoction to cause excessive spurious emissions through the KX2's antenna port, I had a look with a spectrum analyzer, which only covered 10 MHz and up, though. The strongest signal I could find there was around -70 dBm (for comparison, the KX2's oscillator frequency leaked at -46 dBm when the preamp was off).

I also had a look at the lower frequencies with an SDR. Unsurprisingly, various harmonics of the switching frequency could be seen. After referencing the dBFS to dBm by comparing with a reference signal from an Elecraft XG3, it appears that the strongest harmonics are around -60 dBm.

<img src="illustrations/sdr_spectrum.png" alt="SDR spectrum" width="600">

Finally, to check the situation that interests the SOTA activator the most, I did a quick empirical test on a summit in a typical setup, with a 40/30/20m EFHW connected to the KX2 in SSB mode. Then I tried charging my iPhone at 10 W (9 V) from the KXUSBC2, and in a separate test, charging the KX2's battery from an external power bank at 18 W (12 V) while operating. In both cases, I could not discern a difference in noise floor on 80-20m, despite disconnecting/reconnecting the USB source/sink many times to find out. There were some spurious wandering signals around 14.310 MHz that I could trace to the charger, probably the 9th harmonic mentioned above, which was even higher now because it was cold on the summit.

So to sum it up: QRM doesn't seem to be a big issue, even if you're charging while operating. And when not charging, the switching converter is completely off, so no QRM.
