# Charging & OTG

The KXUSBC2 adds a bidirectional USB-C port to your KX2, allowing you to:

- Charge the KX2's internal battery from any USB-C power source
- Charge external devices (phones, tablets, etc.) from the KX2's battery (OTG mode)

You can also charge from a 9-15 V supply connected to the KX2's external DC jack.

## Charging the KX2 battery

=== "Connect a power source"

    - Use any USB-C charger, power bank, or computer USB port
    - Supports USB PD 3.0, QC, and BC1.2 protocols
    - You can also connect a DC power supply (9-15 V) to the KX2's DC jack
    - Maximum charging power: 30 W

=== "Charging behavior"

    - The board automatically negotiates the best available voltage/current profile
    - Delay of 3 seconds for non-PD-capable sources before charging begins
    - Default charging current: 2 A (configurable, max. 3 A)
    - Charging voltage: 12.6 V for 3S Li-Ion (configurable for other battery types)
    - The charger uses either USB-C or the DC jack input, whichever is connected first

!!! note "Charging while operating"
    By default, charging is inhibited when the KX2 is powered on, to avoid any chance of QRM. This can be changed in firmware configuration if desired — see [Configuration](config.md#configuration-options).

## Using OTG/source mode

On-The-Go (OTG) mode lets the KXUSBC2 charge external devices from the KX2's battery.

=== "Starting OTG mode"

    - Connect a USB-C sink (phone, tablet, GPS, etc.) to the port
    - The board will automatically detect and switch to source mode

=== "Power output"

    - Maximum output: 30 W (5-15 V)
    - Default current limit: 3 A (configurable)
    - Minimum battery voltage: 9.0 V (configurable, prevents over-discharge)

!!! warning "Low battery protection"
    If battery voltage drops below the limit, discharging stops and the LED blinks red (2 Hz). Recharge the battery before OTG mode will work again.

## LED status indicators

The RGB LED provides visual feedback on the board's status:

| State | Color | Pattern |
|-------|-------|---------|
| Disconnected | Off | – |
| Negotiating PD | Green/Yellow[^1] | Blinking 5 Hz |
| Charging | Green/Yellow[^1] | Pulsing (frequency indicates current) |
| Fully charged | Green | Steady |
| Temperature warning | Red | Steady |
| Fault (over-voltage/current) | Red | Blinking 5 Hz |
| Fault (low battery in OTG) | Red | Blinking 2 Hz |
| Fault (charger init) | Red | 3 blinks at 2 Hz, then pause |
| Fault (EEPROM) | Red | 4 blinks at 2 Hz, then pause |
| Rig on (charging inhibited) | Magenta | Steady |
| Discharging (OTG) | Blue/Cyan[^1] | Pulsing (frequency indicates current) |

[^1]: Yellow/Cyan indicates temperature in the "warm" or "cool" region (reduced current)

??? info "Pulsing frequency indicates charge/discharge current"
    | Current | Cycle time |
    |---|---|
    | < 500 mA | 8.5 s |
    | 500-999 mA | 2.5 s |
    | 1000-1999 mA | 1.2 s |
    | ≥ 2000 mA | 0.8 s |

## Battery voltage monitoring

The KX2 can display the battery voltage in the menu, like with the KXIBC2:

1. Set the "KXIBC2" menu option to "NOR" in the KX2 configuration
2. The battery voltage will appear as "BT" in the KX2 VFO B display

## Real-time clock (RTC)

The KXUSBC2 includes an RTC that works with the KX2's clock functions:

- Automatically temperature-compensated
- Calibrate using the KX2's "RTC ADJ" menu as usual
- Maximum correction: ±127 ppm (about 11 seconds per day)
