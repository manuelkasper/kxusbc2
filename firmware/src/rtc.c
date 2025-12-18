/*
 * Emulates the bare bones time keeping functionality of a PCF2123 over SPI.
 * Only the seconds, minutes, hours and offset registers are implemented, as
 * used by the Elecraft KX2.
 *
 * Peripherals used: RTC, SPI0 (on alternate pins PC0-PC3), PORTC interrupt.
 */
#include <avr/common.h>
#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/cpufunc.h>
#include <stdbool.h>
#include <util/atomic.h>

#include "rtc.h"
#include "util.h"
#include "sysconfig.h"
#include "debug.h"
#include "insomnia.h"
#include "userrow.h"

static volatile uint8_t nextRegister = 0;
static volatile bool write = false;

// We use the RTC peripheral to keep a running count of ticks (at 1024 Hz) in RTC.CNT,
// and also use its periodic interrupt timer (PIT) to increment our wall-clock timekeeping.
static volatile uint8_t hours = 0;
static volatile uint8_t minutes = 0;
static volatile uint8_t seconds = 0;

// Offset applied by temperature compensation 
static volatile int16_t temperature_offset_ppm = 0;

static void spi_init(void);
static void rtc_measure_temperature_offset(void);
static void rtc_update_calib(void);

void rtc_init(void) {
    spi_init();

    // Configure RTC at 1024 Hz (32.768kHz / 32) with external crystal
    ccp_write_io((void*)&(CLKCTRL.XOSC32KCTRLA), 0); // Disable first
    while (CLKCTRL.MCLKSTATUS & CLKCTRL_XOSC32KS_bm); // Wait until stopped
    ccp_write_io((void*)&(CLKCTRL.XOSC32KCTRLA), CLKCTRL_CSUT_1K_gc | CLKCTRL_RUNSTDBY_bm | CLKCTRL_ENABLE_bm);
    RTC.CLKSEL = RTC_CLKSEL_TOSC32K_gc;
    while (RTC.STATUS & RTC_CTRLABUSY_bm); // Wait for sync
    RTC.CTRLA = RTC_RUNSTDBY_bm | RTC_PRESCALER_DIV32_gc | RTC_RTCEN_bm;

    rtc_measure_temperature_offset();

    // Configure PIT for one second interrupts
    while (RTC.PITSTATUS & RTC_CTRLBUSY_bm); // Wait for sync
    RTC.PITCTRLA = RTC_PERIOD_CYC32768_gc | RTC_PITEN_bm;
    RTC.PITINTCTRL |= RTC_PI_bm;

#ifdef RTC_CALIBRATION_MODE
    // Output 32.768 kHz /64 = 512 Hz clock on PA2 for measuring
    PORTA.DIRSET = PIN2_bm;
    EVSYS.CHANNEL1 = EVSYS_CHANNEL1_RTC_PIT_DIV64_gc;
    EVSYS.USEREVSYSEVOUTA = EVSYS_USER_CHANNEL1_gc;
#endif
}

void rtc_get_time(uint8_t *phours, uint8_t *pminutes, uint8_t *pseconds) {
    *phours = hours;
    *pminutes = minutes;
    *pseconds = seconds;
}

uint16_t rtc_get_ticks(void) {
    uint16_t count;
    // Disable interrupts to read 16-bit register to prevent TEMP clobbering
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
        while (RTC.STATUS & RTC_CNTBUSY_bm); // Wait for sync
        count = RTC.CNT;
    }
    return count;
}

void rtc_set_alarm(uint16_t ticks) {
    while (RTC.STATUS & RTC_CMPBUSY_bm); // Wait for sync
    RTC.CMP = rtc_get_ticks() + ticks;
    RTC.INTFLAGS |= RTC_CMP_bm; // Clear any pending interrupt flag
    RTC.INTCTRL |= RTC_CMP_bm;
}

static void spi_init(void) {
    // Configure SPI MISO for output
    PORTC.DIRSET = PIN1_bm;

    // Enable SPI SS interrupt and invert SS pin (KX2 output is active high, but SPI peripheral expects active low)
    PORTC.PIN3CTRL = PORT_INVEN_bm | PORT_ISC_BOTHEDGES_gc;

    // Switch to alternate SPI0 pins (PC0-PC3)
    PORTMUX.SPIROUTEA |= PORTMUX_SPI0_ALT1_gc;
    SPI0.INTCTRL |= SPI_IE_bm; // Enable SPI interrupt
    SPI0.CTRLA |= SPI_ENABLE_bm;
}

static void rtc_measure_temperature_offset(void) {
#ifdef RTC_TEMPERATURE_COMPENSATION
     // Measure temperature and adjust RTC.CALIB accordingly

    // From Abracon ABS06 crystal datasheet:
    // - temperature coefficient: -0.03 ppm/T^2,
    // - turnover temperature: +25 °C
    int16_t temp_diff = measure_chip_temperature() - 25;
    int16_t offset_x100 = -3 * temp_diff * temp_diff;
    temperature_offset_ppm = (offset_x100 + (offset_x100 >= 0 ? 50 : -50)) / 100;
#endif

    rtc_update_calib();
}

static void rtc_update_calib(void) {
    int8_t factory_offset = 0;
    if (userrow_valid()) {
        factory_offset = userrow->factoryRtcOffset;
    }
#ifdef RTC_CALIBRATION_MODE
    // Ignore temperature compensation and user offset in RTC calibration mode
    int16_t total_offset = factory_offset;
#else
    int16_t total_offset = sysconfig->userRtcOffset + factory_offset + temperature_offset_ppm;
#endif

    // Clamp to RTC.CALIB range of -127 to 127
    if (total_offset < -127) {
        total_offset = -127;
    } else if (total_offset > 127) {
        total_offset = 127;
    }

    debug_printf("RTC calibration update: user %d ppm, factory %d ppm, temp %d ppm => total %d ppm\n",
                 sysconfig->userRtcOffset, factory_offset, temperature_offset_ppm, total_offset);

    // CALIB does not use two's complement, but a sign bit + magnitude
    if (total_offset < 0) {
        RTC.CALIB = ((-total_offset) & 0x7F) | 0x80;
    } else {
        RTC.CALIB = total_offset & 0x7F;
    }
    while (RTC.STATUS & RTC_CTRLBUSY_bm); // Wait for sync
    RTC.CTRLA |= RTC_CORREN_bm; // Enable correction
}

void rtc_handle_spi_ss(void) {
    // Note: this is called from an interrupt context
    if (PORTC.IN & PIN3_bm) {
        // SS went high
        insomnia_mask &= ~INSOMNIA_RTC_SPI;
    } else {
        // SS went low
        insomnia_mask |= INSOMNIA_RTC_SPI;

        // Reset state
        nextRegister = 0;
        write = false;
        SPI0.DATA = 0x00; // Dummy byte
    }
}

ISR(RTC_PIT_vect) {
    RTC.PITINTFLAGS |= RTC_PI_bm; // Clear interrupt flag

    // This interrupt occurs every second
    seconds++;
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
            if (hours >= 24) {
                hours = 0;
            }
        }
        rtc_measure_temperature_offset();
    }
}

ISR(RTC_CNT_vect) {
    if (RTC.INTFLAGS & RTC_CMP_bm) {
        RTC.INTFLAGS |= RTC_CMP_bm; // Clear interrupt flag
        // Alarm occurred
        // Disable further interrupts
        RTC.INTCTRL &= ~RTC_CMP_bm;
    }
}

ISR(SPI0_INT_vect) {
    if (!(SPI0.INTFLAGS & SPI_IF_bm)) {
        return; // No interrupt flag
    }

    uint8_t readData = SPI0.DATA;

    if (nextRegister == 0) {
        // First byte is command byte
        if (readData & 0x80) {
            // Read command
            write = false;
        } else {
            // Write command
            write = true;
        }
        nextRegister = readData & 0x0F;
        if (write) {
            SPI0.DATA = 0x00; // Dummy byte for write
            return;
        }
    }

    if (write) {
        // Write operation
        if (nextRegister == 0x02) {
            seconds = bcdToDecimal(readData);
        } else if (nextRegister == 0x03) {
            minutes = bcdToDecimal(readData);
        } else if (nextRegister == 0x04) {
            hours = bcdToDecimal(readData);
        } else if (nextRegister == 0x0d) {
            int8_t offset = readData & 0x7F; // Assume KX2 always uses course mode
            if (offset & 0x40) {
                offset |= 0x80; // Sign extend negative value
            }

            // The offset is given in units of 4.34 ppm (see PCF2123 datasheet, page 29).
            int16_t newUserRtcOffset = ((int16_t)offset * 434) / 100;

            // Store the offset in our EEPROM. The KX2 will store it on its own as well, but
            // will not send it back to us on its own - only when the user goes back into the
            // RTC ADJ menu and changes it.
            sysconfig_update_word(&sysconfig->userRtcOffset, newUserRtcOffset);

            rtc_update_calib();
        }
        SPI0.DATA = 0x00;
    } else {
        // Read operation
        if (nextRegister == 0x02) {
            // Read seconds
            SPI0.DATA = decimalToBcd(seconds);
        } else if (nextRegister == 0x03) {
            // Read minutes
            SPI0.DATA = decimalToBcd(minutes);
        } else if (nextRegister == 0x04) {
            // Read hours
            SPI0.DATA = decimalToBcd(hours);
        } else {
            SPI0.DATA = 0x00;
        }
    }
    nextRegister++;
}