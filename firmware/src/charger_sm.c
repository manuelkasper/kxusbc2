#include "charger_sm.h"
#include "bq.h"
#include "fsc_pd_ctl.h"
#include "platform.h"
#include "kx2.h"
#include "led.h"
#include "sysconfig.h"
#include "debug.h"
#include "rtc.h"
#include "fsc_pd/timer.h"
#include <avr/io.h>

static ChargerState current_state;
static uint16_t otg_voltage;
static uint16_t otg_current;
static struct TimerObj state_timer;

static ChargerState last_state_led;
TemperatureStatus last_temp_status_led;
ChargeStatus last_charge_status_led;

static void update_led_for_state(void);
static void check_fault_conditions(void);
static void set_state(ChargerState new_state);
static bool check_rig_inhibit(void);
static void update_charging_led(void);

/* State-specific functions (grouped by state) */
static void enter_disconnected(void);
static uint16_t handle_disconnected(void);

static void enter_dc_charging(void);
static uint16_t handle_dc_charging(void);

static void enter_usb_negotiating(void);
static uint16_t handle_usb_negotiating(void);

static void enter_usb_type_c_charging(void);
static uint16_t handle_usb_type_c_charging(void);

static void enter_usb_pd_charging(void);
static uint16_t handle_usb_pd_charging(void);

static uint16_t handle_rig_on(void);
static uint16_t handle_discharging(void);
static uint16_t handle_fault(void);

/* ===== Initialization ===== */

bool charger_sm_init(void) {
    current_state = CHARGER_DISCONNECTED;
    otg_voltage = 0;
    otg_current = 0;
    TimerDisable(&state_timer);
    return true;
}

/* ===== Event Handlers ===== */

void charger_sm_on_bq_interrupt(void) {
    // BQ interrupt will be detected by state machine checking hardware status
    // No action needed here - state machine queries BQ directly
    //debug_printf("SM: BQ interrupt received\n");
}

void charger_sm_on_pd_state_change(void) {
    // PD state will be detected by state machine checking connection state
    // No action needed here - state machine queries fsc_pd directly
    debug_printf("SM: PD state change: %d, %d\n", fsc_pd_get_connection_state(), fsc_pd_get_policy_state());
}

void charger_sm_on_kx2_state_change(bool rig_on) {
    // KX2 state will be detected by state machine checking kx2_is_on()
    // No action needed here - state machine queries kx2 directly
    (void)rig_on;
    //debug_printf("SM: KX2 state change\n");
}

void charger_sm_on_pps_voltage_update(uint16_t mv) {
    // Skip if no change
    if (otg_voltage == mv) {
        return;
    }

    otg_voltage = mv;

    // When PPS voltage is set to non-zero, PD has negotiated OTG mode
    // Configure BQ and transition to DISCHARGING state
    if (mv > 0) {
        // If there is an input voltage on VAC2 (DC jack), we cannot enter OTG mode.
        // The charger IC seems to have a restriction, and no matter what we do with
        // EN_ACDRV1/2 and DIS_ACDRV, OTG mode will not start as long as there is an
        // input voltage on VAC2. The datasheet is not clear on this point, but this
        // forum post by a TI employee seems to confirm it:
        // https://e2e.ti.com/support/power-management-group/power-management/f/power-management-forum/1546390/bq25792-otg-use-case#pifragment-323297-paged-content
        // However, if OTG is already active and the DC jack is then plugged in,
        // OTG will continue to function normally.
        if (bq_get_ac2_present()) {
            //debug_printf("SM: Cannot enter OTG mode while DC jack is connected\n");
            return;
        }
        bq_disable_charging();
        bq_set_acdrv(true, false);
        bq_enable_otg(mv);
        set_state(CHARGER_DISCHARGING);
    } else {
        // OTG mode ended
        bq_disable_otg();
        if (current_state == CHARGER_DISCHARGING) {
            set_state(CHARGER_DISCONNECTED);
        }
    }
}

void charger_sm_on_pps_current_update(uint16_t ma) {
    if (ma > sysconfig.otgCurrentLimit) {
        ma = sysconfig.otgCurrentLimit;
    }

    // Skip if no change
    if (otg_current == ma) {
        return;
    }

    otg_current = ma;
    
    // Configure BQ with the new current limit
    bq_set_otg_current_limit(ma);
}

/* ===== State Machine Core ===== */

/**
 * @brief Check if rig inhibit is active and transition to RIG_ON if needed
 * @return true if inhibited (transitioned to RIG_ON), false otherwise
 */
static bool check_rig_inhibit(void) {
    if (kx2_is_on() && !sysconfig.chargeWhenRigIsOn) {
        set_state(CHARGER_RIG_ON);
        return true;
    }
    return false;
}

uint16_t charger_sm_run(void) {
    //debug_printf("SM: Current state: %d\n", current_state);

    // Check for faults every cycle
    check_fault_conditions();

    // Dispatch to state-specific handler
    uint16_t timeout = 0;
    switch (current_state) {
        case CHARGER_DISCONNECTED:
            timeout = handle_disconnected();
            break;
        case CHARGER_DC_CHARGING:
            timeout = handle_dc_charging();
            break;
        case CHARGER_USB_NEGOTIATING:
            timeout = handle_usb_negotiating();
            break;
        case CHARGER_USB_TYPE_C_CHARGING:
            timeout = handle_usb_type_c_charging();
            break;
        case CHARGER_USB_PD_CHARGING:
            timeout = handle_usb_pd_charging();
            break;
        case CHARGER_RIG_ON:
            timeout = handle_rig_on();
            break;
        case CHARGER_DISCHARGING:
            timeout = handle_discharging();
            break;
        case CHARGER_FAULT:
            timeout = handle_fault();
            break;
        default:
            // Reserved/unused states - fall back to disconnected
            set_state(CHARGER_DISCONNECTED);
            break;
    }

    update_led_for_state();

    return timeout;
}

/* ================================================================================
 * CHARGER_DISCONNECTED - No input present
 * ================================================================================ */

static void enter_disconnected(void) {
    bq_disable_charging();
    bq_disable_otg();
    otg_voltage = 0;
    otg_current = 0;
}

static uint16_t handle_disconnected(void) {
    // Check if any input available
    if (bq_get_ac2_present()) {
        set_state(CHARGER_DC_CHARGING);
    } else if (bq_get_ac1_present()) {
        if (fsc_pd_get_connection_state() == AttachedSink) {
            set_state(CHARGER_USB_NEGOTIATING);
        }
    }
    return 0;
}

/* ================================================================================
 * CHARGER_DC_CHARGING - DC jack connected
 * ================================================================================ */

static void enter_dc_charging(void) {
    bq_set_acdrv(false, true);
    bq_set_input_current_limit(sysconfig.dcInputCurrentLimit);
    
    if (!kx2_is_on() || sysconfig.chargeWhenRigIsOn) {
        bq_enable_charging();
    }
}

static uint16_t handle_dc_charging(void) {
    // Check if KX2 turned on
    if (check_rig_inhibit()) {
        return 0;
    }
    
    // DC jack charging
    if (!bq_get_ac2_present()) {
        // DC removed, check USB
        if (bq_get_ac1_present()) {
            ConnectionState conn = fsc_pd_get_connection_state();
            if (conn == AttachedSink) {
                set_state(CHARGER_USB_NEGOTIATING);
            }
        } else {
            set_state(CHARGER_DISCONNECTED);
        }
    }
    return 0;
}

/* ================================================================================
 * CHARGER_USB_NEGOTIATING - USB attached, waiting for PD negotiation
 * ================================================================================ */

static void enter_usb_negotiating(void) {
    // USB attached, waiting for PD negotiation
    bq_set_acdrv(true, false);
    // Set default current while waiting for negotiation
    bq_set_input_current_limit(fsc_pd_get_advertised_current());

    // Don't enable charging yet - wait for negotiation or timeout
    TimerStart(&state_timer, 3000); // 3s negotiation timeout
}

static uint16_t handle_usb_negotiating(void) {
    // Check if KX2 turned on
    if (check_rig_inhibit()) {
        return 0;
    }
    
    // Check negotiation timeout
    if (TimerExpired(&state_timer)) {
        // Negotiation timeout - fall back to Type-C
        set_state(CHARGER_USB_TYPE_C_CHARGING);
    } else if (fsc_pd_policy_has_contract()) {
        // Contract established
        set_state(CHARGER_USB_PD_CHARGING);
    } else if (!bq_get_ac1_present()) {
        // USB disconnected
        set_state(CHARGER_DISCONNECTED);
    }
    return TimerRemaining(&state_timer);
}

/* ================================================================================
 * CHARGER_USB_TYPE_C_CHARGING - USB Type-C without PD
 * ================================================================================ */

static void enter_usb_type_c_charging(void) {
    // Type-C negotiated without PD (5 V / 0.5..3 A)
    uint16_t adv_current = fsc_pd_get_advertised_current();

    if (adv_current == 500) {
        // No PD contract and default current. May not be a Type-C connector. Leave it up to BC1.2 detection,
        // which automatically sets the current limit after D+/D- detection.
        bq_enable_bc12_detection();
    } else {
        // Type C negotiated - disable BC1.2 detection and use negotiated current
        bq_disable_bc12_detection();
        bq_set_input_current_limit(adv_current);
    }
    
    bq_enable_charging();
}

static uint16_t handle_usb_type_c_charging(void) {
    // Check if KX2 turned on
    if (check_rig_inhibit()) {
        return 0;
    }
    
    // Monitor advertised current changes
    uint16_t adv_current = fsc_pd_get_advertised_current();
    if (adv_current != 500) {
        // Type-C current changed - update BQ
        bq_set_input_current_limit(adv_current);
    }
    
    if (fsc_pd_get_connection_state() != AttachedSink) {
        set_state(CHARGER_DISCONNECTED);
    } else if (fsc_pd_policy_has_contract()) {
        set_state(CHARGER_USB_PD_CHARGING);
    }
    return 0;
}

/* ================================================================================
 * CHARGER_USB_PD_CHARGING - USB with PD negotiated contract
 * ================================================================================ */

static void enter_usb_pd_charging(void) {
    // PD contract established
    uint16_t adv_current = fsc_pd_get_advertised_current();
    
    bq_disable_bc12_detection();
    bq_set_input_current_limit(adv_current);
    bq_enable_charging();
}

static uint16_t handle_usb_pd_charging(void) {
    // Check if KX2 turned on
    if (check_rig_inhibit()) {
        return 0;
    }
    
    // Monitor advertised current changes
    uint16_t adv_current = fsc_pd_get_advertised_current();
    bq_set_input_current_limit(adv_current);
    
    if (fsc_pd_get_connection_state() != AttachedSink) {
        set_state(CHARGER_DISCONNECTED);
    } else if (!fsc_pd_policy_has_contract()) {
        set_state(CHARGER_USB_TYPE_C_CHARGING);
    }
    return 0;
}

/* ================================================================================
 * CHARGER_RIG_ON - Rig powered on, charging inhibited
 * ================================================================================ */

static uint16_t handle_rig_on(void) {
    // Rig powered, charging inhibited
    if (kx2_is_on()) {
        // Stay in RIG_ON
        return 0;
    } else {
        // Rig powered down - return to disconnected for clean restart
        set_state(CHARGER_DISCONNECTED);
    }
    return 0;
}

/* ================================================================================
 * CHARGER_DISCHARGING - OTG mode (providing power)
 * ================================================================================ */

static uint16_t handle_discharging(void) {
    // OTG mode (providing power)
    ConnectionState conn = fsc_pd_get_connection_state();
    if (conn != AttachedSource) {
        // Role swap or disconnected
        bq_disable_otg();
        set_state(CHARGER_DISCONNECTED);
    }
    return 0;
}

/* ================================================================================
 * CHARGER_FAULT - Fault condition detected
 * ================================================================================ */

static uint16_t handle_fault(void) {
    // Stay in fault state until input is disconnected
    if (!bq_get_ac1_present() && !bq_get_ac2_present()) {
        set_state(CHARGER_DISCONNECTED);
    }
    return 0;
}

/* ===== State transition handling ===== */

static void set_state(ChargerState new_state) {
    if (new_state == current_state) {
        return;
    }

    ChargerState previous_state = current_state;
    current_state = new_state;

    debug_printf("SM: State transition %d -> %d\n", previous_state, new_state);

    // Disable any active timers when changing state
    TimerDisable(&state_timer);

    // Call entry handler for new state
    switch (new_state) {
        case CHARGER_DISCONNECTED:
            enter_disconnected();
            break;
        case CHARGER_DC_CHARGING:
            enter_dc_charging();
            break;
        case CHARGER_USB_NEGOTIATING:
            enter_usb_negotiating();
            break;
        case CHARGER_USB_TYPE_C_CHARGING:
            enter_usb_type_c_charging();
            break;
        case CHARGER_USB_PD_CHARGING:
            enter_usb_pd_charging();
            break;
        case CHARGER_RIG_ON:
            bq_disable_charging();
            break;
        case CHARGER_FAULT:
        case CHARGER_DISCHARGING:
        default:
            break;
    }

    update_led_for_state();
}

static void update_led_for_state(void) {
    switch (current_state) {
        case CHARGER_FAULT:
            if (current_state != last_state_led) {
                led_set_blinking(true, false, false, 255, 2, 2, 15, 0);  // Red blinking at 5 Hz
            }
            break;

        case CHARGER_USB_NEGOTIATING:
            if (current_state != last_state_led) {
                led_set_blinking(false, true, false, 255, 2, 2, 15, 0);  // Green blinking at 5 Hz
            }
            break;

        case CHARGER_USB_TYPE_C_CHARGING:
        case CHARGER_USB_PD_CHARGING:
        case CHARGER_DC_CHARGING:
            // Always update, even if the state hasn't changed, as the temperature or charger status may have
            update_charging_led();
            break;

        case CHARGER_RIG_ON:
            if (current_state != last_state_led) {
                led_set_color(255, 0, 255);  // Magenta - Rig powered
            }
            break;

        case CHARGER_DISCHARGING:
            // Always update, even if the state hasn't changed, as the temperature or charger status may have
            update_charging_led();
            break;

        default:
            if (current_state != last_state_led) {
                led_set_color(0, 0, 0);
            }
            break;
    }

    last_state_led = current_state;
}

static void update_charging_led(void) {
    // Check temperature and charge status
    TemperatureStatus temp_status = bq_get_temperature_status();
    ChargeStatus charge_status = bq_get_charge_status();

    if (current_state == last_state_led && charge_status == last_charge_status_led && temp_status == last_temp_status_led) {
        // No change
        return;
    }

    //debug_printf("SM: Updating charging LED: %u %u %u\n", current_state, temp_status, charge_status);

    if (temp_status & (TEMP_HOT | TEMP_COLD)) {
        // Hot or cold - (dis)charging is suspended
        led_set_color(255, 0, 0); // Red
    } else {
        // Color depends on temperature - green (or blue) for normal, yellow (or cyan) for warm/cool
        bool warm_cool = (temp_status & (TEMP_WARM | TEMP_COOL)) ? true : false;

        if (current_state == CHARGER_DISCHARGING) {
            // OTG mode - blue/cyan blinking at 2 Hz
            led_set_blinking(false, warm_cool, true, 255, 5, 5, 15, 0);
        } else {
            switch (charge_status) {
                case FAST_CHARGE_CC:
                    led_set_blinking(warm_cool, true, false, 255, 5, 5, 15, 0); // Green or yellow blinking at 2 Hz
                    break;
                case TRICKLE_CHARGE:
                case PRECHARGE:
                case TAPER_CHARGE_CV:
                case TOPOFF_TIMER_CHARGING:
                    led_set_blinking(warm_cool, true, false, 255, 10, 10, 15, 0); // Green or yellow blinking at 1 Hz
                    break;
                default:
                    led_set_color(0, 255, 0); // Green
                    break;
            }
        }
    }
    
    last_temp_status_led = temp_status;
    last_charge_status_led = charge_status;
}

static void check_fault_conditions(void) {
    // Detect new faults
    if (bq_get_fault_status() != 0) {
        if (current_state != CHARGER_FAULT) {
            debug_printf("SM: Fault detected: %x\n", bq_get_fault_status());
            set_state(CHARGER_FAULT);
        }
    } else {
        // No fault
        if (current_state == CHARGER_FAULT) {
            debug_printf("SM: Fault cleared\n");
            set_state(CHARGER_DISCONNECTED);
        }
    }
}
