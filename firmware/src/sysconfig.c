#include <avr/eeprom.h>

#include "sysconfig.h"

static EEMEM struct SysConfig sysconfig_eeprom = {
    .role = DRP,
    .pdMode = PD_3_0,
    .chargingCurrentLimit = 3000,
    .chargingVoltageLimit = 12600,
    .dcInputCurrentLimit = 3000,
    .otgCurrentLimit = 3000,
    .chargeWhenRigIsOn = false,
    .enableThermistor = false,
    .factoryRtcOffset = 0,
    .userRtcOffset = 0
};

struct SysConfig sysconfig;

void sysconfig_read(void) {
    eeprom_read_block(&sysconfig, &sysconfig_eeprom, sizeof(sysconfig));
}

void sysconfig_write(void) {
    eeprom_write_block(&sysconfig, &sysconfig_eeprom, sizeof(sysconfig));
}
