#include <avr/wdt.h>
#include "bq.h"
#include "fsc_pd_ctl.h"
#include "watchdog.h"

void watchdog_init(void) {
#ifndef RTC_CALIBRATION_MODE
    // Enable watchdog with 8s timeout
    wdt_enable(0xB);
#else
    // In calibration mode, disable watchdog as RTC is not running normally
    wdt_disable();
#endif
}

void watchdog_tickle(void) {
    // Query BQ to make sure we can communicate with it via I2C
    if (!bq_test_connection()) {
        // Communication failure - do not reset watchdog, let system reset
        return;
    }

    if (!fsc_pd_test_connection()) {
        // Communication failure - do not reset watchdog, let system reset
        return;
    }

    wdt_reset();
}
