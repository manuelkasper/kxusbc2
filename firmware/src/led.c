// LP5815 LED driver implementation
#include "twi.h"
#include "led.h"
#include <avr/io.h>
#include <util/delay.h>

#define LP5815_ADDR 0x2D

static void led_stop_animation(void);

typedef enum {
    LED_OFF = 0,
    LED_SOLID,
    LED_BLINKING,
    LED_BREATHING
} LedMode;

typedef struct {
    LedMode mode;
    bool red;
    bool green;
    bool blue;
    uint8_t brightness;    // brightness
    uint8_t blink_t_on;
    uint8_t blink_t_off;
    uint8_t blink_count;
    uint8_t blink_pause;
    uint8_t breathing_speed;
} LedState;

static LedState current_state;

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

    // Set maximum current 10 mA on blue (OUT0)
    led_write_register(0x14, 100);

    // Set maximum current 2.5 mA on green (OUT1)
    led_write_register(0x15, 25);

    // Set maximum current 5 mA on red (OUT2)
    led_write_register(0x16, 50);

    // Enable all three outputs
    led_write_register(0x02, 0x07);

    // Send update command (necessary for changes to registers 0x01 to 0x05 to take effect)
    led_write_register(0x0F, 0x55);

    // Put chip in standby to reduce power consumption
    led_write_register(0x00, 0x02);
}

void led_off(void) {
    if (current_state.mode == LED_OFF) {
        // No change
        return;
    }

    led_stop_animation();
    led_write_register(0x18, 0);
    led_write_register(0x19, 0);
    led_write_register(0x1A, 0);

    // Put chip in standby to reduce power consumption
    led_write_register(0x00, 0x02);

    current_state.mode = LED_OFF;
}

void led_set_color(bool red, bool green, bool blue, uint8_t brightness) {
    if (brightness == 0 || (!red && !green && !blue)) {
        led_off();
        return;
    }

    if (current_state.mode == LED_SOLID &&
        current_state.red == red &&
        current_state.green == green &&
        current_state.blue == blue &&
        current_state.brightness == brightness) {
        // No change
        return;
    }

    led_stop_animation();
    led_write_register(0x18, blue ? brightness : 0);
    led_write_register(0x19, green ? brightness : 0);
    led_write_register(0x1A, red ? brightness : 0);

    // Ensure chip is enabled
    led_write_register(0x00, 0x03);

    current_state.mode = LED_SOLID;
    current_state.red = red;
    current_state.green = green;
    current_state.blue = blue;
    current_state.brightness = brightness;
}

void led_set_blinking(bool red, bool green, bool blue, uint8_t brightness, uint8_t t_on, uint8_t t_off, uint8_t count, uint8_t pause) {
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

    if (current_state.mode == LED_BLINKING &&
        current_state.red == red &&
        current_state.green == green &&
        current_state.blue == blue &&
        current_state.brightness == brightness &&
        current_state.blink_t_on == t_on &&
        current_state.blink_t_off == t_off &&
        current_state.blink_count == count &&
        current_state.blink_pause == pause) {
        // No change
        return;
    }

    // Ensure chip is enabled
    led_write_register(0x00, 0x03);
    
    // Stop animation
    led_write_register(0x11, 0xAA);

    // Enable ENGINE0_ORDER0
    led_write_register(0x0A, 0x01);

    // Set ENGINE0 infinite repeat
    led_write_register(0x0C, 0x03);

    // PATTERN0_PAUSE_TIME
    led_write_register(0x1C, pause);

    // PATTERN0_REPEAT_TIME
    led_write_register(0x1D, count);

    // PATTERN0_PWM0..4
    led_write_register(0x1E, brightness);
    led_write_register(0x1F, brightness);
    led_write_register(0x20, 0);
    led_write_register(0x21, 0);
    led_write_register(0x22, 0);

    // PATTERN0_SLOPER_TIME1
    led_write_register(0x23, t_on);
    led_write_register(0x24, t_off);
    
    // Enable autonomous animation on selected outputs
    uint8_t output_enable = 0;
    if (blue) {
        output_enable |= 0x01;
    }
    if (green) {
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

    current_state.mode = LED_BLINKING;
    current_state.red = red;
    current_state.green = green;
    current_state.blue = blue;
    current_state.brightness = brightness;
    current_state.blink_t_on = t_on;
    current_state.blink_t_off = t_off;
    current_state.blink_count = count;
    current_state.blink_pause = pause;
}

void led_set_breathing(bool red, bool green, bool blue, uint8_t brightness, uint8_t speed) {
    // speed: 1..9, higher = slower

    if (current_state.mode == LED_BREATHING &&
        current_state.red == red &&
        current_state.green == green &&
        current_state.blue == blue &&
        current_state.brightness == brightness &&
        current_state.breathing_speed == speed) {
        // No change
        return;
    }

    // Ensure chip is enabled
    led_write_register(0x00, 0x03);
    
    // Stop animation
    led_write_register(0x11, 0xAA);

    // Enable ENGINE0_ORDER0
    led_write_register(0x0A, 0x01);

    // Set ENGINE0 infinite repeat
    led_write_register(0x0C, 0x03);

    // PATTERN0_PAUSE_TIME
    led_write_register(0x1C, 0);

    // PATTERN0_REPEAT_TIME
    led_write_register(0x1D, 15);

    // PATTERN0_PWM0..4
    led_write_register(0x1E, 0);
    led_write_register(0x1F, brightness);
    led_write_register(0x20, brightness);
    led_write_register(0x21, 0);
    led_write_register(0x22, 0);

    // PATTERN0_SLOPER_TIME1
    led_write_register(0x23, speed << 4 | (speed + 6));
    led_write_register(0x24, speed << 4 | (speed + 6));
    
    // Enable autonomous animation on selected outputs
    uint8_t output_enable = 0;
    if (blue) {
        output_enable |= 0x01;
    }
    if (green) {
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

    current_state.mode = LED_BREATHING;
    current_state.red = red;
    current_state.green = green;
    current_state.blue = blue;
    current_state.brightness = brightness;
    current_state.breathing_speed = speed;
}

static void led_stop_animation(void) {
    // Stop animation
    led_write_register(0x11, 0xAA);

    // Disable autonomous animation on all outputs
    led_write_register(0x04, 0x00);

    // Send update command
    led_write_register(0x0F, 0x55);

    // Put chip in standby to reduce power consumption
    led_write_register(0x00, 0x02);
}

// Shutdown LED driver to save power. Must use led_wakeup() to reinitialize.
// Saves about 20 µA, takes about 250 µs to wake up.
void led_shutdown(void) {
    led_off();
    led_write_register(0x0D, 0x33);
}

void led_wakeup(void) {
    // Special wakeup procedure: generate at least 8 falling edges on SDA while SCL is high
    TWI0.MCTRLA &= ~TWI_ENABLE_bm;
    PORTB.OUTSET = PIN0_bm;
    for (uint8_t i = 0; i <= 20; i++) {
        PORTB.OUTTGL = PIN1_bm;
        _delay_us(10);
    }
    TWI0.MCTRLA |= TWI_ENABLE_bm;
    led_init();
}
