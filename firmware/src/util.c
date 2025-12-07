#include "util.h"

#include <avr/io.h>
#include <avr/interrupt.h>
#include <util/atomic.h>

uint8_t decimalToBcd(uint8_t val) {
    return ((val / 10) << 4) | (val % 10);
}

uint8_t bcdToDecimal(uint8_t val) {
    return ((val >> 4) * 10) + (val & 0x0F);
}

int16_t measure_chip_temperature(void) {
    // Measure internal chip temperature using TEMPSENSE, with factory calibration
    ADC0.CTRLA = ADC_ENABLE_bm;
    ADC0.CTRLB = ADC_PRESC_DIV64_gc;
    ADC0.CTRLC = ADC_REFSEL_1024MV_gc;
    ADC0.CTRLE = 16;
    ADC0.MUXPOS = ADC_MUXPOS_TEMPSENSE_gc;
    ADC0.COMMAND = ADC_MODE_SINGLE_12BIT_gc | ADC_START_IMMEDIATE_gc; // Start conversion
    while (!(ADC0.INTFLAGS & ADC_RESRDY_bm)); // Wait for completion
    
    // Disable interrupts to read 16-bit register to prevent TEMP clobbering
    uint16_t adc_reading;
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
        adc_reading = ADC0.RESULT >> 2;
    }
    ADC0.CTRLA &= ~ADC_ENABLE_bm;

    int8_t sigrow_offset = SIGROW.TEMPSENSE1;
    uint8_t sigrow_gain = SIGROW.TEMPSENSE0;

    uint32_t temp = adc_reading - sigrow_offset;
    temp *= sigrow_gain; // Result might overflow 16 bit variable (10bit+8bit)
    temp += 0x80; // Add 1/2 to get correct rounding on division below
    temp >>= 8; // Divide result to get Kelvin
    int16_t temperature_celsius = temp - 273;
    return temperature_celsius;
}