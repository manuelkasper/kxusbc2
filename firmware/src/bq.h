#pragma once

#include <stdint.h>
#include <stdbool.h>

#include "twi.h"

typedef enum {
    NOT_CHARGING = 0x0,
    TRICKLE_CHARGE = 0x1,
    PRECHARGE = 0x2,
    FAST_CHARGE_CC = 0x3,
    TAPER_CHARGE_CV = 0x4,
    TOPOFF_TIMER_CHARGING = 0x6,
    CHARGE_DONE = 0x7
} ChargeStatus;

typedef enum {
    NO_INPUT = 0x0,
    USB_SDP = 0x1,
    USB_CDP = 0x2,
    USB_DCP = 0x3,
    HVDCP = 0x4,
    UNKNOWN = 0x5,
    NON_STANDARD = 0x6,
    OTG = 0x7,
    NOT_QUALIFIED = 0x8,
    VBUS_DIRECT = 0xB
} VbusStatus;

typedef enum {
    TEMP_NORMAL = 0x0,
    TEMP_HOT = 0x1,
    TEMP_WARM = 0x2,
    TEMP_COOL = 0x4,
    TEMP_COLD = 0x8
} TemperatureStatus;

bool bq_init(void);
bool bq_test_connection(void);
void bq_notify_interrupt(void);
bool bq_process_interrupts(void);
bool bq_enable_charging(void);
bool bq_disable_charging(void);
bool bq_enable_bc12_detection(void);
bool bq_disable_bc12_detection(void);
bool bq_enable_otg(uint16_t votg);
bool bq_disable_otg(void);
bool bq_set_acdrv(bool enable_acdrv1, bool enable_acdrv2);
bool bq_set_charge_voltage_limit(uint16_t charge_voltage_limit);
bool bq_set_charge_current_limit(uint16_t charge_current_limit);
bool bq_set_otg_current_limit(uint16_t ma);
bool bq_set_input_current_limit(uint16_t ma);
bool bq_set_vbus_discharge(bool discharge);
bool bq_set_thermistor(bool enable);

uint16_t bq_get_charge_voltage(void);
uint16_t bq_get_charge_current_limit(void);
uint16_t bq_get_input_voltage_limit(void);
uint16_t bq_get_input_current_limit(void);
ChargeStatus bq_get_charge_status(void);
VbusStatus bq_get_vbus_status(void);
bool bq_get_vbat_present(void);
bool bq_get_vbus_present(void);
bool bq_get_ac1_present(void);
bool bq_get_ac2_present(void);
bool bq_get_acdrv1_status(void);
bool bq_get_acdrv2_status(void);

bool bq_enable_adc(void);
bool bq_disable_adc(void);
uint16_t bq_measure_vbus(void);
int16_t bq_measure_ibus(void);
uint16_t bq_measure_vbat(void);
int16_t bq_measure_ibat(void);
uint16_t bq_get_fault_status(void);
TemperatureStatus bq_get_temperature_status(void);
int16_t bq_measure_temperature(void);
uint16_t bq_measure_thermistor(void);
