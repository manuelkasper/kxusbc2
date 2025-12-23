#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "fsc_pd/core.h"

#define PD_NEGOTIATION_TIMEOUT 3000 * TICK_SCALE_TO_MS

/**
 * @brief Charger state enumeration
 */
typedef enum {
    CHARGER_DISCONNECTED = 0,           // No power source available
    CHARGER_USB_NEGOTIATING,            // USB attached, PD negotiation in progress
    CHARGER_USB_TYPE_C_CHARGING,        // Charging from USB Type-C (500mA/1.5A)
    CHARGER_USB_PD_CHARGING,            // Charging from USB with PD contract
    CHARGER_DC_CHARGING,                // Charging from DC jack (VAC2)
    CHARGER_RIG_ON,                     // Rig powered on, charging inhibited
    CHARGER_DISCHARGING,                // OTG mode, providing power to sink
    CHARGER_DISCHARGING_BLOCKED,        // OTG mode blocked due to low battery
    CHARGER_FAULT,                      // Fault detected
    CHARGER_STATE_COUNT
} ChargerState;

/**
 * @brief Initialize the charger state machine
 *
 * Must be called during system startup after BQ, PD, and platform subsystems
 * are initialized.
 *
 * @return true if initialization successful, false otherwise
 */
bool charger_sm_init(void);

/**
 * @brief Run the state machine
 *
 * Should be called regularly from the main event loop. Processes state
 * transitions and performs state-specific actions.
 *
 * @return Ticks until next required update, or 0 if no specific timeout is pending. Use to set RTC alarm.
 */
uint16_t charger_sm_run(void);

/* ===== Event Triggers ===== */

/**
 * @brief Notify state machine of BQ charger interrupt
 *
 * Called when BQ_INT pin asserts (from ISR context or polled).
 * Reasons for interrupt:
 * - ACx_PRESENT changed
 * - Charging status changed
 * - Fault detected
 * - Temperature warning
 */
void charger_sm_on_bq_interrupt(void);

/**
 * @brief Notify state machine of FUSB302/PD state change
 *
 * Called when PD core detects attachment, detachment, or contract change.
 * State machine will query fsc_pd_get_connection_state(), etc.
 */
void charger_sm_on_pd_state_change(void);

/**
 * @brief Notify state machine of PPS voltage update from PD core
 *
 * Called when platform_set_pps_voltage() is invoked by PD policy engine.
 * Only relevant in DISCHARGING (OTG) state.
 *
 * @param mv Voltage in mV (from PD in 20mV increments, converted to mV here)
 */
void charger_sm_on_pps_voltage_update(uint16_t mv);

/**
 * @brief Notify state machine of PPS current update from PD core
 *
 * Called when platform_set_pps_current() is invoked by PD policy engine.
 * Only relevant in DISCHARGING (OTG) state.
 *
 * @param ma Current in mA
 */
void charger_sm_on_pps_current_update(uint16_t ma);

/* ===== Getters ===== */

/**
 * @brief Get the current charger state
 *
 * @return Current ChargerState
 */
ChargerState charger_sm_get_state(void);
