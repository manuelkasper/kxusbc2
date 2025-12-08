#include "bq.h"
#include "debug.h"
#include <avr/io.h>
#include <util/delay.h>

#define BQ_ADDR 0x6B

static uint8_t bq_read_register(uint8_t reg);
static uint16_t bq_read_register16(uint8_t reg);
static bool bq_write_register(uint8_t reg, uint8_t value);
static bool bq_write_register16(uint8_t reg, uint16_t value);
static bool bq_set_register_bit(uint8_t reg, uint8_t bitmask, bool set);

static bool bq_read_error = false;
static volatile bool bq_interrupt_pending = false;

static uint8_t bq_read_register(uint8_t reg) {
    uint8_t data;
    if (twi_send_and_read_bytes(BQ_ADDR, reg, &data, 1)) {
        return data;
    } else {
        bq_read_error = true;
        return 0;
    }
}

static uint16_t bq_read_register16(uint8_t reg) {
    uint8_t data[2];
    if (twi_send_and_read_bytes(BQ_ADDR, reg, data, 2)) {
        return (data[0] << 8) | data[1];
    } else {
        bq_read_error = true;
        return 0;
    }
}

static bool bq_write_register(uint8_t reg, uint8_t value) {
    return twi_send_bytes(BQ_ADDR, (uint8_t[]){reg, value}, 2);
}

static bool bq_write_register16(uint8_t reg, uint16_t value) {
    return twi_send_bytes(BQ_ADDR, (uint8_t[]){reg, (value >> 8) & 0xFF, value & 0xFF}, 3);
}

static bool bq_set_register_bit(uint8_t reg, uint8_t bitmask, bool set) {
    uint8_t value = bq_read_register(reg);
    if (set) {
        value |= bitmask;
    } else {
        value &= ~bitmask;
    }
    return bq_write_register(reg, value);
}

bool bq_init(void) {
    bool success = true;

    // Configure BQ_INT pin
    PORTA.PIN6CTRL = PORT_INVEN_bm | PORT_PULLUPEN_bm;

    // Configure BQ_CE pin
    PORTA.DIRSET = PIN7_bm;
    PORTA.OUTSET = PIN7_bm;
    PORTA.PIN7CTRL = PORT_INVEN_bm;

    // Reset to defaults
    success &= bq_write_register(0x09, 0x45);
    if (!success) {
        return false;
    }
    _delay_ms(250);

    // Set up registers according to our needs. The comments below only reflect deviations from the POR defaults.

    // REG00: Minimal system voltage (VSYSMIN): 9 V
    success &= bq_write_register(0x00, 0x1A);

    // REG01: Charge voltage limit (VREG): 12.6 V (Li-ion 3S)
    success &= bq_write_register16(0x01, 0x04EC);

    // REG03: Charge current limit (ICHG): 3 A
    success &= bq_write_register16(0x03, 0x012C);

    // REG05: Input voltage limit (VINDPM) determined automatically from VBUS upon plugin
    
    // REG06: Input current limit (IINDPM) determined automatically via D+/D- detection

    // REG08: Use precharge current of 200 mA when battery is below 66.7% of VREG
    success &= bq_write_register(0x08, 0x85);

    // REG09: Termination current (ITERM) is set to default 200 mA (above, along with defaults reset)

    // REG0A: Cell count, recharge deglitch time and recharge threshold offset are left at defaults

    // REG0B: OTG mode regulation voltage (VOTG) is set during operation as negotiated

    // REG0D: OTG current limit (IOTG): 3 A
    success &= bq_write_register(0x0D, 0x4B);

    // REG0E: Timers are left at default values

    // REG0F: Enable ICO, start with charging disabled
    success &= bq_write_register(0x0F, 0x92);

    // REG10: Disable watchdog timer
    success &= bq_write_register(0x10, 0x00);

    // REG11: Enable automatic D+/D- detection (we will override IINDPM later if PD is used)
    success &= bq_write_register(0x11, 0x00);

    // REG11: Enable HVDCP, 9 and 12 V support
    success &= bq_write_register(0x11, 0xF8);

    // REG12: Disable BATFED LDO in pre-charge stage, as our load is not connected to SYS
    // See also: https://e2e.ti.com/support/power-management-group/power-management/f/power-management-forum/1443121/bq25792-expected-behavior-when-large-load-on-battery-causes-vbat-to-drop-during-charging
    // Also disable PFM
    success &= bq_write_register(0x12, 0x34);

    // REG13: 1.5 MHz switching frequency, disable STAT pin (not used)
    success &= bq_write_register(0x13, 0x11);

    // REG14: Disable external ILIM_HIZ setting
    success &= bq_write_register(0x14, 0x14);

    // REG16: Temperature control thresholds and VBUS/VAC pulldowns: defaults

    // REG17: NTC JEITA temperature dependent charge voltage/current settings: defaults

    // REG18: NTC temperature thresholds: defaults

    // REG28: Charger Mask 0: enable AC1/AC2_PRESENT interrupt
    success &= bq_write_register(0x28, 0xF9);

    // REG29: Charger Mask 1: enable CHG interrupt
    success &= bq_write_register(0x29, 0x7F);

    // REG2A: Charger Mask 2: disable all interrupts
    success &= bq_write_register(0x2A, 0x7F);

    // REG2B: Charger Mask 3: enable temperature interrupts
    success &= bq_write_register(0x2B, 0x10);

    // REG2C: Fault Mask 0: defaults (all interrupts on)

    // REG2D: Fault Mask 1: defaults (all interrupts on)

#ifdef DEBUG
    // Enable ADC, continuous mode, 15 bit resolution
    // Disable for production (uses around 1 mA)
    success &= bq_write_register(0x2E, 0x80);
#endif

    // Enable BQ_INT interrupts
    PORTA.PIN6CTRL |= PORT_ISC_RISING_gc;

    return success;
}

bool bq_test_connection(void) {
    uint8_t part_info = bq_read_register(0x48);
    if (bq_read_error || (part_info & 0x3F) != 0x08) {
        return false;
    }
    return true;
}

void bq_notify_interrupt(void) {
    // We can't perform an I2C write here, as we're being called from an ISR.
    // If we did, we might interfere with another ongoing I2C transaction.
    bq_interrupt_pending = true;
}

bool bq_process_interrupts(void) {
    if (!bq_interrupt_pending) {
        return false;
    }
    bq_interrupt_pending = false;
    
    uint8_t charger_flag_0 = bq_read_register(0x22);
    if (charger_flag_0 & 0x06) {
        // AC1/AC2_PRESENT changed
        return true;
    }
    uint8_t charger_flag_3 = bq_read_register(0x25);
    if (charger_flag_3 & 0x0F) {
        // TS temperature crossed
        return true;
    }

    return false;
}

bool bq_disable_charging(void) {
    return bq_set_register_bit(0x0F, 0x20, false);  // EN_CHG = 0
}

bool bq_enable_charging(void) {
    return bq_set_register_bit(0x0F, 0x20, true);  // EN_CHG = 1
}

bool bq_enable_bc12_detection(void) {
    return bq_set_register_bit(0x11, 0xC0, true);  // force detection now
}

bool bq_disable_bc12_detection(void) {
    return bq_set_register_bit(0x11, 0x40, false);
}

bool bq_enable_otg(uint16_t votg) {
    bool success = true;

    if (votg < 2800 || votg > 22000) {
        return false;
    }

    // Set output voltage (VOTG)
    success &= bq_write_register16(0x0B, (votg - 2800) / 10);

    // USB DCP: short-circuit D+ and D- (1.5 A)
    success &= bq_write_register(0x47, 0xE0);

    // Set EN_OTG
    success &= bq_set_register_bit(0x12, 0x40, true);

    // Set EN_ACDRV1 (we only output OTG via USB, not via DC jack)
    success &= bq_set_register_bit(0x13, 0x40, true);

    // Apple (legacy/Lightning): apply 2.7 V to D+ and D- (2.4 A)
    //success &= bq_write_register(0x47, 0xB4);

    return success;
}

bool bq_disable_otg(void) {
    bool success = true;

    // Disable EN_OTG
    success &= bq_set_register_bit(0x12, 0x40, false);

    // Reset D+/D- drivers
    success &= bq_write_register(0x47, 0x00);

    return success;
}

bool bq_set_acdrv(bool enable_acdrv1, bool enable_acdrv2) {
    uint8_t reg = bq_read_register(0x13);
    if (enable_acdrv1) {
        reg |= 0x40;
    } else {
        reg &= ~0x40;
    }
    if (enable_acdrv2) {
        reg |= 0x80;
    } else {
        reg &= ~0x80;
    }
    return bq_write_register(0x13, reg);
}

bool bq_set_otg_current_limit(uint16_t ma) {
    if (ma < 120 || ma > 3320) {
        return false;
    }
    return bq_write_register(0x0D, ma / 40);
}

bool bq_set_input_current_limit(uint16_t ma) {
    // REG06: Input current limit (IINDPM)
    if (ma < 100 || ma > 3300) {
        return false;
    }
    return bq_write_register16(0x06, ma / 10);
}

bool bq_set_charge_voltage_limit(uint16_t charge_voltage_limit) {
    // REG01: Charge voltage limit (VREG)
    return bq_write_register16(0x01, charge_voltage_limit / 10);
}

bool bq_set_charge_current_limit(uint16_t charge_current_limit) {
    // REG03: Charge current limit (ICHG)
    return bq_write_register16(0x03, charge_current_limit / 10);
}

bool bq_set_vbus_discharge(bool discharge) {
    // Enable both VBUS and VAC1 pull down resistors
    return bq_set_register_bit(0x16, 0x0C, discharge);
}

bool bq_set_thermistor(bool enable) {
    return bq_set_register_bit(0x18, 0x01, !enable);
}

uint16_t bq_get_charge_voltage(void) {
    return bq_read_register16(0x01) * 10;
}

uint16_t bq_get_charge_current_limit(void) {
    return bq_read_register16(0x03) * 10;
}

uint16_t bq_get_input_voltage_limit(void) {
    return bq_read_register(0x05) * 100;
}

uint16_t bq_get_input_current_limit(void) {
    return bq_read_register16(0x06) * 10;
}

ChargeStatus bq_get_charge_status(void) {
    uint8_t chg_status_1 = bq_read_register(0x1C);
    return (chg_status_1 >> 5) & 0x07;
}

VbusStatus bq_get_vbus_status(void) {
    uint8_t chg_status_1 = bq_read_register(0x1C);
    return (chg_status_1 >> 1) & 0x0F;
}

bool bq_get_vbat_present(void) {
    uint8_t chg_status_2 = bq_read_register(0x1D);
    return chg_status_2 & 0x01;
}

bool bq_get_vbus_present(void) {
    return bq_read_register(0x1B) & 0x01;
}

bool bq_get_ac1_present(void) {
    return bq_read_register(0x1B) & 0x02;
}

bool bq_get_ac2_present(void) {
    return bq_read_register(0x1B) & 0x04;
}

bool bq_get_acdrv1_status(void) {
    return bq_read_register(0x13) & 0x40;
}

bool bq_get_acdrv2_status(void) {
    return bq_read_register(0x13) & 0x80;
}

uint16_t bq_measure_vbus(void) {
    return bq_read_register16(0x35);
}

int16_t bq_measure_ibus(void) {
    return (int16_t)bq_read_register16(0x31);
}

uint16_t bq_measure_vbat(void) {
    return bq_read_register16(0x3B);
}

int16_t bq_measure_ibat(void) {
    return (int16_t)bq_read_register16(0x33);
}

uint16_t bq_get_fault_status(void) {
    uint8_t fault_status_0 = bq_read_register(0x20) & 0x7F;
    uint8_t fault_status_1 = bq_read_register(0x21);
    return (fault_status_0 << 8) | fault_status_1;
}

TemperatureStatus bq_get_temperature_status(void) {
    return bq_read_register(0x1F) & 0x0F;
}

int16_t bq_measure_temperature(void) {
    // Measure chip die temperature (TDIE)
    // Temperature is in steps of 0.5 degrees Celsius
    return bq_read_register16(0x41);
}

uint16_t bq_measure_thermistor(void) {
    // Measure thermistor, returns relative reading (0..1023 corresponding to 0..100%)
    uint16_t thermistor_reading = bq_read_register16(0x3F);
    return thermistor_reading;
}
