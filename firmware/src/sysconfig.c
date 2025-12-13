#include <avr/eeprom.h>

#include "sysconfig.h"
#include "debug.h"

// Definition for default EEPROM config, goes in .eeprom section, resulting in .eep file when compiling
volatile EEMEM struct SysConfig sysconfig_eeprom = {
    .magic = SYSCONFIG_MAGIC,
    .role = DRP,
    .pdMode = PD_3_0,
    .chargingCurrentLimit = 3000,
    .chargingVoltageLimit = 12600,
    .dcInputCurrentLimit = 3000,
    .otgCurrentLimit = 3000,
    .dischargingVoltageLimit = 9000,
    .otgVoltageHeadroom = 100,
    .chargeWhenRigIsOn = false,
    .enableThermistor = false,
    .userRtcOffset = 0
};

// Memory-mapped pointer to sysconfig in EEPROM
struct SysConfig *sysconfig = (struct SysConfig*)MAPPED_EEPROM_START;

bool sysconfig_valid(void) {
    return sysconfig->magic == SYSCONFIG_MAGIC;
}

void sysconfig_update_word(void *addr, uint16_t value) {
    eeprom_update_word(addr - MAPPED_EEPROM_START, value);
}
