#include "platform.h"
#include "debug.h"
#include "rtc.h"
#include "twi.h"
#include "bq.h"
#include "fsc_pd_ctl.h"
#include "charger_sm.h"
#include <avr/io.h>
#include <util/delay.h>

void platform_set_vbus_lvl_enable(FSC_U8 port,
                                  VBUS_LVL level,
                                  FSC_BOOL enable,
                                  FSC_BOOL disableOthers)
{
    switch (level) {
    case VBUS_LVL_5V:
        platform_set_pps_voltage(0, 250);
        break;
    case VBUS_LVL_HV:
        // Do nothing - handled by separate call to platform_set_pps_voltage
        break;
    case VBUS_LVL_ALL:
        if (!enable) {
            // Turn off supply
            platform_set_pps_voltage(0, 0);
        } else {
            // Enabling all supplies does not make sense and should never happen
        }
        break;
    }
}

void platform_set_vbus_discharge(FSC_U8 port, FSC_BOOL enable) {
    //debug_printf("Set VBUS discharge: %u\n", enable);
    if (enable) {
        // Ensure OTG mode is off
        bq_disable_otg();
    }
    bq_set_vbus_discharge(enable);
}

FSC_BOOL platform_get_device_irq_state(FSC_U8 port) {
    // Return state of FUSB_INT pin (active low)
    return fsc_pd_interrupt_pending();
}

FSC_BOOL platform_i2c_write(FSC_U8 SlaveAddress,
                            FSC_U8 RegAddrLength,
                            FSC_U8 DataLength,
                            FSC_U8 PacketSize,
                            FSC_U8 IncSize,
                            FSC_U8 RegisterAddress,
                            FSC_U8* Data) {
    return twi_send_reg_bytes(SlaveAddress, RegisterAddress, Data, DataLength);
}

FSC_BOOL platform_i2c_read( FSC_U8 SlaveAddress,
                            FSC_U8 RegAddrLength,
                            FSC_U8 DataLength,
                            FSC_U8 PacketSize,
                            FSC_U8 IncSize,
                            FSC_U8 RegisterAddress,
                            FSC_U8* Data) {
    return twi_send_and_read_bytes(SlaveAddress, RegisterAddress, Data, DataLength);
}

void platform_delay_10us(FSC_U8 delayCount) {
    // delayCount is in units of 10 us
    for (uint8_t i = 0; i < delayCount; i++) {
        _delay_us(10);
    }
}

void platform_set_pps_voltage(FSC_U8 port, FSC_U16 mv) {
    // mv is in 20 mV increments, convert to mV
    mv *= 20;
    //debug_printf("Set PPS voltage: %u mV\n", mv);
    // Delegate all OTG voltage management to state machine
    charger_sm_on_pps_voltage_update(mv);
}

void platform_set_pps_current(FSC_U8 port, FSC_U16 ma) {
    //debug_printf("Set PPS current: %u mA\n", ma);
    // Delegate all OTG current management to state machine
    charger_sm_on_pps_current_update(ma);
}

FSC_U16 platform_get_system_time(void) {
    // The RTC counts 1/1024 seconds, pretty close to milliseconds for many purposes, but if desired,
    // one can also adjust timers/delays/etc. using TICK_SCALE_TO_MS.
    return rtc_get_ticks();
}

