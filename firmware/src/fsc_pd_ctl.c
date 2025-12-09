#include "fsc_pd_ctl.h"
#include "vendor_info.h"
#include "sysconfig.h"
#include "charger_sm.h"
#include "insomnia.h"
#include "twi.h"
#include "debug.h"

#define FUSB302_I2C_ADDR 0x22

static DevicePolicyPtr_t dpm;
static Port_t port;

FSC_U8 PD_Specification_Revision;

static void fsc_pd_event_handler(FSC_U32 event, FSC_U8 portId, void *usr_ctx, void *app_ctx);

void fsc_pd_init(void) {
    PD_Specification_Revision = sysconfig.pdMode == PD_3_0 ? USBPDSPECREV3p0 : USBPDSPECREV2p0;
    port.PortID = 0;
    core_initialize(&port, FUSB302_I2C_ADDR);
    core_enable_typec(&port, TRUE);
    core_enable_pd(&port, sysconfig.pdMode != PD_OFF);
    DPM_Init(&dpm);
    DPM_AddPort(dpm, &port);
    port.dpm = dpm;

    switch (sysconfig.role) {
        case DRP:
            core_set_drp(&port);
            break;
        case SRC:
            core_set_source(&port);
            break;
        case SNK:
            core_set_sink(&port);
            break;
        case TRY_SRC:
            core_set_try_src(&port);
            break;
        case TRY_SNK:
            core_set_try_snk(&port);
            break;
    }

    // Update source capabilities to reflect maximum configured OTG current
    // TODO: Disable PPS if PD 2.0 in use
    uint16_t max_current = sysconfig.otgCurrentLimit / PDO_FIXED_CURRENT_STEP;
    for (uint8_t i = 0; i < NUMBER_OF_SRC_PDOS_ENABLED; i++) {
        if (port.src_caps[i].FPDOSupply.MaxCurrent > max_current) {
            port.src_caps[i].FPDOSupply.MaxCurrent = max_current;
        }
    }

    register_observer(EVENT_ALL, fsc_pd_event_handler, NULL);

    // FUSB_INT pin
    PORTA.PIN5CTRL = PORT_ISC_LEVEL_gc | PORT_PULLUPEN_bm;
}

bool fsc_pd_test_connection(void) {
    uint8_t device_id;
    if (twi_send_and_read_bytes(FUSB302_I2C_ADDR, 0x01, &device_id, 1)) {
        if ((device_id & 0x8C) == 0x80) {
            return true;
        }
    }
    return false;
}

// Run the state machine. Returns the number of ticks until the next required wakeup, or 0
// if no timed wakeup is required.
uint16_t fsc_pd_run(void) {
    core_state_machine(&port);
    fsc_pd_enable_interrupt();
    return core_get_next_timeout(&port);
}

void fsc_pd_notify_interrupt(void) {
    // Note: called from ISR context
    // Disable further interrupts until we process this one
    PORTA.PIN5CTRL &= ~PORT_ISC_LEVEL_gc;
    insomnia_mask |= INSOMNIA_FSC_PD;
}

void fsc_pd_enable_interrupt(void) {
    // Re-enable FUSB_INT pin interrupt
    insomnia_mask &= ~INSOMNIA_FSC_PD;
    PORTA.PIN5CTRL |= PORT_ISC_LEVEL_gc;
}

bool fsc_pd_interrupt_pending(void) {
    return !(PORTA.IN & PIN5_bm);
}

ConnectionState fsc_pd_get_connection_state(void) {
    return port.ConnState;
}

PolicyState_t fsc_pd_get_policy_state(void) {
    return port.PolicyState;
}

uint16_t fsc_pd_get_advertised_current(void) {
    return core_get_advertised_current(&port);
}

bool fsc_pd_policy_has_contract(void) {
    return port.PolicyHasContract == TRUE;
}

void fsc_pd_swap_roles(void) {
    debug_printf("Swap roles\n");
    if (port.PolicyState == peSinkReady) {
        port.PortConfig.reqPRSwapAsSnk = TRUE;
    } else if (port.PolicyState == peSourceReady) {
        port.PortConfig.reqPRSwapAsSrc = TRUE;
    }
}

static void fsc_pd_event_handler(FSC_U32 event, FSC_U8 portId, void *usr_ctx, void *app_ctx) {
    //debug_printf("Event: %lu\n", event);
    if (event == PD_STATE_CHANGED || event == PD_NO_CONTRACT) {
        charger_sm_on_pd_state_change();
    }
}