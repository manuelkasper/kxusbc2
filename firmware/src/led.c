#include "twi.h"
#include "led.h"

#define LP5815_ADDR 0x2D

static bool led_write_register(uint8_t reg, uint8_t value) {
    return twi_send_bytes(LP5815_ADDR, (uint8_t[]){reg, value}, 2);
}

void led_init(void) {
    // Reset
    led_write_register(0x0E, 0xCC);

    // Enable chip, instant blinking disable
    led_write_register(0x00, 0x03);

    // Set maximum current = 25.5 mA
    led_write_register(0x01, 0x00);

    // Set maximum current 5 mA on green (OUT0)
    led_write_register(0x14, 50);

    // Set maximum current 20 mA on blue (OUT1)
    led_write_register(0x15, 200);

    // Set maximum current 10 mA on red (OUT2)
    led_write_register(0x16, 100);

    // Enable all three outputs
    led_write_register(0x02, 0x07);

    // Send update command (necessary for changes to registers 0x01 to 0x05 to take effect)
    led_write_register(0x0F, 0x55);

    // Put chip in standby to reduce power consumption
    led_write_register(0x00, 0x02);
}

void led_set_color(uint8_t red, uint8_t green, uint8_t blue) {
    led_write_register(0x18, green);
    led_write_register(0x19, blue);
    led_write_register(0x1A, red);
    if (red == 0 && green == 0 && blue == 0) {
        // Special case: put chip in standby to reduce power consumption
        led_write_register(0x00, 0x02);
    } else {
        // Ensure chip is enabled
        led_write_register(0x00, 0x03);
    }
}

void led_set_blinking(bool red, bool green, bool blue, uint8_t pwm, uint8_t t_on, uint8_t t_off, uint8_t count, uint8_t pause) {
    // on, off and pause values:
    // 0x0 = no pause time
    // 0x1 = 0.05s
    // 0x2 = 0.10s
    // 0x3 = 0.15s
    // 0x4 = 0.20s
    // 0x5 = 0.25s
    // 0x6 = 0.30s
    // 0x7 = 0.35s
    // 0x8 = 0.40s
    // 0x9 = 0.45s
    // 0xA = 0.50s
    // 0xB = 1.00s
    // 0xC = 2.00s
    // 0xD = 4.00s
    // 0xE = 6.00s
    // 0xF = 8.00s
    // count: number of blinks between pauses; 0..14 (15 = infinite)

    // Ensure chip is enabled
    led_write_register(0x00, 0x03);

    // Enable ENGINE0_ORDER0
    led_write_register(0x0A, 0x01);

    // Set ENGINE0 infinite repeat
    led_write_register(0x0C, 0x03);

    // PATTERN0_PAUSE_TIME: no pause
    led_write_register(0x1C, pause);

    // PATTERN0_REPEAT_TIME infinite repeats
    led_write_register(0x1D, count);

    // PATTERN0_PWM0..4
    led_write_register(0x1E, pwm);
    led_write_register(0x1F, pwm);
    led_write_register(0x20, 0);
    led_write_register(0x21, 0);
    led_write_register(0x22, 0);

    // PATTERN0_SLOPER_TIME1
    led_write_register(0x23, t_on);
    led_write_register(0x24, t_off);
    
    // Enable autonomous animation on selected outputs
    uint8_t output_enable = 0;
    if (green) {
        output_enable |= 0x01;
    }
    if (blue) {
        output_enable |= 0x02;
    }
    if (red) {
        output_enable |= 0x04;
    }
    led_write_register(0x04, output_enable);

    // Disable manual PWM
    led_write_register(0x18, 0);
    led_write_register(0x19, 0);
    led_write_register(0x1A, 0);

    // Send update command
    led_write_register(0x0F, 0x55);

    // Start animation
    led_write_register(0x10, 0xFF);
}

void led_stop_blinking(void) {
    // Stop animation
    led_write_register(0x11, 0xAA);

    // Disable autonomous animation on all outputs
    led_write_register(0x04, 0x00);

    // Send update command
    led_write_register(0x0F, 0x55);

    // Put chip in standby to reduce power consumption
    led_write_register(0x00, 0x02);
}
