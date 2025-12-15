# Firmware notes

The firmware is designed to be built with AVR-GCC.

Prerequisites:

* AVR-GCC toolchain (version 15.2.0)
* AVRDUDE (for programming)


## Build instructions

1. Download release v4.1.2 of the FUSB302 reference code from onsemi (login required): https://www.onsemi.com/design/evaluation-board/FUSB302BGEVB
2. Place the downloaded file `FUSB302 REFERENCE CODE.ZIP` in the root directory of the repository.
3. `sh merge_fsc_pd.sh`
4. Edit `Makefile` and set `PROGRAMMER` and `PORT` as needed.
5. `make` to compile the code.
6. `make flash` to flash the AVR.
7. `make eeprom` to write the default sysconfig settings to the EEPROM.
8. `make fuses` to program the fuses.

`DEBUG` should be set to 0 for release builds, otherwise standby consumption will increase (periodic debug status output, charger ADC active for measurements etc.).

### Recommended fuse settings

The following settings are applied with `make fuses`:

* BOD level: 2.6 V
* Sample frequency: 1 kHz
* BOD mode in active: sampled
* BOD mode in sleep: sampled

#### AVRDUDE config

```
config bodsleep=bod_sampled
config bodactive=bod_sampled
config bodsampfreq=bod_1khz
config bodlevel=bod_2v6
```


## USB PD support

USB Power Delivery (PD) is a pretty complex specification/protocol that involves sending messages between the source and the sink (over the CC lines of the USB-C connector) to exchange capabilities and negotiate a power profile. Implementing a PD protocol stack from scratch for a DRP (Dual Role Port) would be a major undertaking. With some optimizations, I have succeeded in squeezing the reference code supplied by onsemi (makers of the FUSB302B IC) into the 32 KB flash of the ATtiny3226, and making it work.

The downside is that due to the license, while the reference code may be used freely in conjunction with onsemi chips, it cannot be redistributed. Therefore, this repository does not include the complete firmware source code, and requires downloading the reference code from onsemi and applying a patch with my optimizations before the firmware can be compiled (see instructions above).

### Modifications to the onsemi reference code
The patch included in the repository, `fsc_pd.patch`, which is applied automatically by `merge_fsc_pd.sh`, makes the following changes to the reference code:

- Replaced `FSC_U32` with `FSC_U16` or `FSC_U8` where bigger values would never be used anyway. As the AVR is an 8-bit device, operations with larger integers are expensive in terms of code size, memory usage and execution speed, especially if multiplication or division are involved.
    - This shaves around 1700 bytes from the compiled code size.
- When PD 3.0 support is enabled, devices that send a “Get Source Capabilities Extended” message trigger a hardware bug in the FUSB302B, which doesn't automatically send a GoodCRC for this particular message type.
    - Devices that send such messages then run into a timeout because they don't get the expected GoodCRC, and a hard reset loop ensues.
    - The onsemi reference code has a software workaround for this, enabled by the `FSC_GSCE_FIX` define. It works by sending a manual GoodCRC in software for such messages. As the GoodCRC timeout is 1 ms (tReceive), this has to happen fast.
    - However, there is also a bug in the code enabled by `FSC_GSCE_FIX`. Specifically, it uses the `I_CRC_CHK` interrupt instead of the normal `I_GCRCSENT` to trigger receiving a packet in `PDProtocol.c:ProtocolIdle()`. The latter can also be called from `ProtocolSendingMessage()`, but before making that call, `ProtocolSendingMessage()` already checks if `I_TXSENT` or `I_CRC_CHK` are set, and if either of them is, then it also clears `I_CRC_CHK`. This causes `ProtocolIdle()` to miss the incoming packet, which will only be processed when the next packet comes in – usually too late, so timers expire and hard resets are made. The usual case where this is triggered is when the PD source rejects a request, and doesn't send any further packets. Then the tSenderResponse timeout kicks in, the code issues a hard reset, and this loops forever.
    - The patch comments out the clearing of the `I_CRC_CHK` bit, which does not appear to have negative consequences.
- Increased tSenderResponse to 32 ms (USB PD ECN “Chunking Timing Issue”).
- Fixed case-sensitivity issue in `Port.c`: the onsemi code includes `"fusb30x.h"` but the actual filename is `fusb30X.h`. This had caused compilation to fail on case-sensitive filesystems (Linux).


## Programming/Debugging

The ATtiny3226 has a one-wire UPDI interface for programming and debugging. The KXUSBC2 board provides this on a 3-pin 2.54 mm header on the backside, along with Vcc (3.3 V) and GND. The header doesn't actually need to be soldered – the middle pad is slightly offset/staggered, so one can get a good-enough interference fit by simply sticking a pin header through the holes for a temporary connection to the debugger. Call it a poor man's (or hobbyist-friendly) Tag-Connect 😂 This can be used directly with a NanoUPDI or a UPDI Friend, thus providing a programming solution for less than $10.

There is also a serial interface on a separate 3-pin header (also staggered), wired to the MCU's hardware USART, as UPDI does not support debug console output. Note that the levels there are 3.3 V, not RS-232.


## Configuration

The following settings can be set in the EEPROM (see also the definitions in https://github.com/manuelkasper/kxusbc2/blob/main/firmware/src/sysconfig.h):

| Byte offset | Description | Type | Default | Range |
|:------------|:------------|:-----|:--------|:------|
| 0 | Magic value (to detect erased EEPROM) | `uint16` | 0x4355
| 2 | Role | Enum<ul><li>0: SRC</li><li>1: SNK</li><li>2: DRP</li><li>3: TRY_SRC</li><li>4: TRY_SNK</li></ul> | 2: DRP
| 3 | PD mode | Enum<ul><li>0: Off</li><li>1: PD 2.0</li><li>2: PD 3.0</li></ul> | 2: PD 3.0
| 4 | Charging current limit (mA, max. current into battery) | `uint16` | 3000 | 50…5000
| 6 | Charging voltage limit (mV, termination voltage for CV phase) | `uint16` | 12600 | 10000…18800
| 8 | DC input current limit (mA, from DC jack) | `uint16` | 3000 | 100…3300
| 10 | OTG current limit (mA, output to USB) | `uint16` | 3000 | 120…3320
| 12 | Discharging voltage limit (mV, minimum battery voltage for OTG mode) | `uint16` | 9000 |
| 14 | OTG voltage headroom (mV, will be added to output voltage) | `uint16` | 100 | 0…500
| 16 | Allow charging while rig is on | `bool` | 0
| 17 | Enable thermistor | `bool` | 0
| 18 | User RTC offset (ppm, set in KX2 RTC ADJ menu) | `int16` | 0 | -278…+273

**Note that the AVR is a little endian platform**, e.g. the value 3000 would be represented as 0xB80B in EEPROM.

The OTG voltage headroom can be used to compensate for losses in the MOSFETs, PCB traces, cable etc.

### User Row

The MCU has a special EEPROM section called User Row, which is not erased in case of a Chip Erase command. This is different from the normal EEPROM, which is erased, unless the EESAVE fuse is programmed.

The User Row is currently used to store a factory-calibrated RTC offset, so that it is not inadvertently erased.

| Byte offset | Description | Type | Default | Range |
|:------------|:------------|:-----|:--------|:------|
| 0 | Magic value (to detect erased User Row) | `uint16` | 0x5255
| 2 | Factory RTC offset (ppm) | `int8` | 0 | -127…127


## RTC emulation

The firmware acts as an SPI slave/client, emulating PCF2123-style registers to the KX2 firmware. Only the set of registers actually used by the KX2 firmware is implemented. The RTC peripheral of the MCU is clocked by an external 32.768 kHz crystal.

A fixed offset (in ppm) can be set in the sysconfig/EEPROM to calibrate each board.

The KX2 has an "RTC ADJ" menu that lets the user compensate for a clock being too slow or too fast, by setting the number of seconds per day to compensate. The KX2 firmware translates this into a correction value for the PCF2123. The RTC emulation in the KXUSBC2 firmware calculates the equivalent ppm correction (4.34 ppm per unit according to the PCF2123 datasheet, in the "course mode" that the KX2 uses), and applies it to the `RTC.CALIB` register of the ATtiny3226. The maximum correction that can be applied this way is ±127 ppm (about 11 seconds per day). Larger values set in the RTC ADJ menu will be clamped to this range.

The RTC emulation also features a temperature compensation. Once a minute, it measures the temperature using the MCU's built-in sensor and calculates an offset according to the temperature coefficient and turnover temperature given in the crystal's datasheet.


## Input priority

The charger uses either the external DC jack input (E pad), or USB, whichever is connected first. If both sources are connected when the charger starts up, it prefers the DC jack input. The charger keeps using the current source as long as it is available, even if another source becomes available. However, if the current source disconnects, the charger switches. For example, if you connect a DC supply while the charger is charging from USB, it will keep using USB. If you then disconnect USB, it will seamlessly switch over to the DC jack input.


## Charge inhibit when rig is on

By default, the firmware suspends charging while the KX2 is on, to avoid any possibility of QRM. This is especially convenient when operating with an external DC power supply at home. Charging resumes as soon as the rig is turned off. Discharging is always possible, even when the rig is on, as the operator can always decide whether or not to plug in a USB-C device to be charged.

The setting can be changed in the EEPROM such that charging is always allowed, regardless of whether the KX2 is on or not.


## LED indications

| State | Color | Style |
|:------|:------|:------|
| Disconnected | off
| Negotiating | green / yellow (*) | blinking 5 Hz
| Charging | green / yellow (*) | “breathing” speed depending on charge current
| Charged | green | steady
| Temperature too high/low | red | steady
| Fault (over-voltage/current, short circuit etc.) | red | blinking 5 Hz
| Fault (battery voltage too low in OTG mode) | red | blinking 2 Hz
| Fault (charger init) | red | 3 x blinking at 2 Hz, followed by 1 s pause
| Fault (EEPROM) | red | 4 x blinking at 2 Hz, followed by 1 s pause
| Rig on (charging inhibited) | magenta | steady
| Discharging (OTG) | blue / cyan (*) | “breathing” speed depending on discharge current

If the thermistor is enabled and the temperature is in the “warm” or ”cool” region (where the current is reduced, but charging continues), the color is yellow (or cyan) instead of green (or blue).

### Charge/discharge speed indication

The LED will “breathe” faster the higher the current into or from the battery is.

| Battery current | LED “breathing” speed |
|:--------|:------|
| < 500 mA | 8.5 s
| 500..999 mA | 2.5 s
| 1000..1999 mA | 1.2 s
| ≥ 2000 mA | 0.8 s

### Low battery during discharge

If the battery voltage drops below the discharging voltage limit set in the EEPROM, discharging will stop, and the LED will blink red. Further attempts to discharge (by disconnecting and reconnecting a sink) will not initiate discharging again, even if the battery voltage has recovered a little in the meantime. The battery must first be recharged, at least for a short time, before discharging is allowed again.


## Connection states

Enum values used by the FSC PD reference code, listed here for convenience to aid in debugging.

| Enum Value            | Number |
|:----------------------|--------|
| Disabled              | 0      |
| ErrorRecovery         | 1      |
| **Unattached**            | 2      |
| AttachWaitSink        | 3      |
| **AttachedSink**          | 4      |
| AttachWaitSource      | 5      |
| **AttachedSource**        | 6      |
| TrySource             | 7      |
| TryWaitSink           | 8      |
| TrySink               | 9      |
| TryWaitSource         | 10     |
| AudioAccessory        | 11     |
| DebugAccessorySource  | 12     |
| AttachWaitAccessory   | 13     |
| PoweredAccessory      | 14     |
| UnsupportedAccessory  | 15     |
| DelayUnattached       | 16     |
| UnattachedSource      | 17     |
| DebugAccessorySink    | 18     |
| AttachWaitDebSink     | 19     |
| AttachedDebSink       | 20     |
| AttachWaitDebSource   | 21     |
| AttachedDebSource     | 22     |
| TryDebSource          | 23     |
| TryWaitDebSink        | 24     |
| UnattachedDebSource   | 25     |
| IllegalCable          | 26     |
| UnattachedSourceOnly  | 27     |


## PD policy states

Enum values used by the FSC PD reference code, listed for convenience here to aid in debugging.

| Enum Value                      | Number |
|:--------------------------------|--------|
| peDisabled                      | 0      |
| peErrorRecovery                 | 1      |
| peSourceHardReset               | 2      |
| peSourceSendHardReset           | 3      |
| peSourceSoftReset               | 4      |
| peSourceSendSoftReset           | 5      |
| peSourceStartup                 | 6      |
| peSourceSendCaps                | 7      |
| peSourceDiscovery               | 8      |
| peSourceDisabled                | 9      |
| peSourceTransitionDefault       | 10     |
| peSourceNegotiateCap            | 11     |
| peSourceCapabilityResponse      | 12     |
| peSourceWaitNewCapabilities     | 13     |
| peSourceTransitionSupply        | 14     |
| **peSourceReady**                   | 15     |
| peSourceGiveSourceCaps          | 16     |
| peSourceGetSinkCaps             | 17     |
| peSourceSendPing                | 18     |
| peSourceGotoMin                 | 19     |
| peSourceGiveSinkCaps            | 20     |
| peSourceGetSourceCaps           | 21     |
| peSourceSendDRSwap              | 22     |
| peSourceEvaluateDRSwap          | 23     |
| peSourceAlertReceived           | 24     |
| peSinkHardReset                 | 25     |
| peSinkSendHardReset             | 26     |
| peSinkSoftReset                 | 27     |
| peSinkSendSoftReset             | 28     |
| peSinkTransitionDefault         | 29     |
| peSinkStartup                   | 30     |
| peSinkDiscovery                 | 31     |
| peSinkWaitCaps                  | 32     |
| peSinkEvaluateCaps              | 33     |
| peSinkSelectCapability          | 34     |
| peSinkTransitionSink            | 35     |
| **peSinkReady**                     | 36     |
| peSinkGiveSinkCap               | 37     |
| peSinkGetSourceCap              | 38     |
| peSinkGetSinkCap                | 39     |
| peSinkGiveSourceCap             | 40     |
| peSinkSendDRSwap                | 41     |
| peSinkAlertReceived             | 42     |
| peSinkEvaluateDRSwap            | 43     |
| peSourceSendVCONNSwap           | 44     |
| peSourceEvaluateVCONNSwap       | 45     |
| peSinkSendVCONNSwap             | 46     |
| peSinkEvaluateVCONNSwap         | 47     |
| peSourceSendPRSwap              | 48     |
| peSourceEvaluatePRSwap          | 49     |
| peSinkSendPRSwap                | 50     |
| peSinkEvaluatePRSwap            | 51     |
| peGetCountryCodes               | 52     |
| peGiveCountryCodes              | 53     |
| peNotSupported                  | 54     |
| peGetPPSStatus                  | 55     |
| peGivePPSStatus                 | 56     |
| peGiveCountryInfo               | 57     |
| peGiveVdm                       | 58     |
| peUfpVdmGetIdentity             | 59     |
| peUfpVdmSendIdentity            | 60     |
| peUfpVdmGetSvids                | 61     |
| peUfpVdmSendSvids               | 62     |
| peUfpVdmGetModes                | 63     |
| peUfpVdmSendModes               | 64     |
| peUfpVdmEvaluateModeEntry       | 65     |
| peUfpVdmModeEntryNak            | 66     |
| peUfpVdmModeEntryAck            | 67     |
| peUfpVdmModeExit                | 68     |
| peUfpVdmModeExitNak             | 69     |
| peUfpVdmModeExitAck             | 70     |
| peUfpVdmAttentionRequest        | 71     |
| peDfpUfpVdmIdentityRequest      | 72     |
| peDfpUfpVdmIdentityAcked        | 73     |
| peDfpUfpVdmIdentityNaked        | 74     |
| peDfpCblVdmIdentityRequest      | 75     |
| peDfpCblVdmIdentityAcked        | 76     |
| peDfpCblVdmIdentityNaked        | 77     |
| peDfpVdmSvidsRequest            | 78     |
| peDfpVdmSvidsAcked              | 79     |
| peDfpVdmSvidsNaked              | 80     |
| peDfpVdmModesRequest            | 81     |
| peDfpVdmModesAcked              | 82     |
| peDfpVdmModesNaked              | 83     |
| peDfpVdmModeEntryRequest        | 84     |
| peDfpVdmModeEntryAcked          | 85     |
| peDfpVdmModeEntryNaked          | 86     |
| peDfpVdmModeExitRequest         | 87     |
| peDfpVdmExitModeAcked           | 88     |
| peSrcVdmIdentityRequest         | 89     |
| peSrcVdmIdentityAcked           | 90     |
| peSrcVdmIdentityNaked           | 91     |
| peDfpVdmAttentionRequest        | 92     |
| peCblReady                      | 93     |
| peCblGetIdentity                | 94     |
| peCblGetIdentityNak             | 95     |
| peCblSendIdentity               | 96     |
| peCblGetSvids                   | 97     |
| peCblGetSvidsNak                | 98     |
| peCblSendSvids                  | 99     |
| peCblGetModes                   | 100    |
| peCblGetModesNak                | 101    |
| peCblSendModes                  | 102    |
| peCblEvaluateModeEntry          | 103    |
| peCblModeEntryAck               | 104    |
| peCblModeEntryNak               | 105    |
| peCblModeExit                   | 106    |
| peCblModeExitAck                | 107    |
| peCblModeExitNak                | 108    |
| peDpRequestStatus               | 109    |
| peDpRequestStatusAck            | 110    |
| peDpRequestStatusNak            | 111    |
| peDpRequestConfig               | 112    |
| peDpRequestConfigAck            | 113    |
| peDpRequestConfigNak            | 114    |
| PE_BIST_Receive_Mode            | 115    |
| PE_BIST_Frame_Received          | 116    |
| PE_BIST_Carrier_Mode_2          | 117    |
| PE_BIST_Test_Data               | 118    |
| dbgGetRxPacket                  | 119    |
| dbgSendTxPacket                 | 120    |
| peSendCableReset                | 121    |
| peSendGenericCommand            | 122    |
| peSendGenericData               | 123    |
