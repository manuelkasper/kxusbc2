#include <avr/io.h>
#include <stdint.h>
#include <stdbool.h>
#include <util/delay.h>
#include <stdio.h>
#include <avr/interrupt.h>
#include <avr/sleep.h>

#include "debug.h"
#include "clock.h"
#include "util.h"
#include "sysconfig.h"
#include "rtc.h"
#include "led.h"
#include "bq.h"
#include "button.h"
#include "twi.h"
#include "fsc_pd_ctl.h"
#include "charger_sm.h"
#include "insomnia.h"
#include "kx2.h"
#include "watchdog.h"

//#define DEBUG_STATUS

#ifdef DEBUG_STATUS
static void bq_print_status(void);
#endif

#ifdef DEBUG
ISR(BADISR_vect) {
    //debug_printf("Bad interrupt\n");
}
#endif

int main(void) {
    clock_init();
    watchdog_init();
    sysconfig_read();
    debug_init();
    kx2_init();
    rtc_init();
    button_init();
    twi_init();
    led_wakeup();
    led_init();

    // Enable global interrupts (also used for serial debug output)
    sei();
    
    debug_printf("Startup, reset flags %x\n", RSTCTRL.RSTFR);
    RSTCTRL.RSTFR = 0xFF; // Clear reset flags
    
    if (!bq_init()) {
        debug_printf("BQ init failed\n");
    }
    bq_set_charge_voltage_limit(sysconfig.maxChargeVoltage);
    bq_set_charge_current_limit(sysconfig.chargeCurrentLimit);
    bq_set_thermistor(sysconfig.enableThermistor);

    fsc_pd_init();
    charger_sm_init();
    button_set_short_press_handler(fsc_pd_swap_roles);

    // Power up blink
    for (uint8_t i = 0; i < 3; i++) {
        led_set_color(255, 255, 255);
        _delay_ms(200);
        led_set_color(0, 0, 0);
        _delay_ms(200);
    }

    bool last_kx2_on_state = kx2_is_on();
#ifdef DEBUG_STATUS
    uint16_t last_bq_status = 0;
#endif
    while (1) {
        // Run PD state machine - returns a timeout in ticks until next required wakeup,
        // or 0 if no wakeup is needed and we can sleep until the next interrupt
        uint16_t next_timeout = fsc_pd_run();

        // Process BQ interrupts and notify state machine
        if (bq_process_interrupts()) {
            charger_sm_on_bq_interrupt();
        }

        // Detect KX2 state changes and notify state machine
        bool curr_kx2_state = kx2_is_on();
        if (curr_kx2_state != last_kx2_on_state) {
            charger_sm_on_kx2_state_change(curr_kx2_state);
            last_kx2_on_state = curr_kx2_state;
        }

        // Run charger state machine - returns a timeout in ticks until the next required wakeup,
        // or 0 if no wakeup is needed and we can sleep until the next interrupt
        uint16_t sm_timeout = charger_sm_run();
        if (sm_timeout > 0 && (sm_timeout < next_timeout || next_timeout == 0)) {
            next_timeout = sm_timeout;
        }

        // Enter low-power mode until next RTC alarm or other interrupt
        // Don't enter sleep if we need to wake up soon (otherwise we may miss the alarm)
        if (next_timeout == 0 || next_timeout >= 100) {
            if (next_timeout != 0) {
                rtc_set_alarm(next_timeout);
            }

            // Only enter sleep mode if no insomnia mask bits are set;
            // use recommended procedure from avr/sleep.h to avoid race conditions
            set_sleep_mode(SLEEP_MODE_STANDBY);
            cli();
            if (insomnia_mask == 0) {
                sleep_enable();
                sei();
                sleep_cpu();
                sleep_disable();
            }
            sei();
        }

#ifdef DEBUG_STATUS
        uint16_t now = rtc_get_ticks();
        if ((now - last_bq_status) >= 1000) {
            bq_print_status();

            last_bq_status = now;
        }
#endif

        // Tickle the watchdog. Note that we get at least one interrupt per second due to the RTC PIT.
        // If the latter is disabled, one must make sure to set the RTC alarm at less than the watchdog timeout interval.
        watchdog_tickle();
    }

    return 0;
}

#ifdef DEBUG_STATUS
static void bq_print_status(void) {
    uint16_t vbus = bq_measure_vbus();
    int16_t ibus = bq_measure_ibus();
    uint16_t vbat = bq_measure_vbat();
    int16_t ibat = bq_measure_ibat();

    // Calculate input/output power and efficiency without using floating point arithmetic
    int32_t pin = ((int32_t)vbus * (int32_t)ibus) / 1000;  // mW
    int32_t pout = ((int32_t)vbat * (int32_t)ibat) / 1000; // mW
    if (fsc_pd_get_connection_state() == AttachedSource) {
        // OTG mode, discharging battery. pin/pout will be negative and swapped
        int32_t temp = -pin;
        pin = -pout;
        pout = temp;
    }
    debug_printf("BQ Status: %d\n", bq_get_charge_status());
    debug_printf("Vbus: %u mV, Ibus: %d mA, limit: %u mV / %u mA\n", vbus, ibus, bq_get_input_voltage_limit(), bq_get_input_current_limit());
    debug_printf("Vbat: %u mV, Ibat: %d mA\n", vbat, ibat);
    debug_printf("Pin: %ld mW, Pout: %ld mW\n", pin, pout);
    debug_printf("BQ temperature: %d.%d C\n", bq_measure_temperature() / 2, (bq_measure_temperature() % 2) * 5);
    debug_printf("BQ thermistor: %u\n", bq_measure_thermistor());
}
#endif
