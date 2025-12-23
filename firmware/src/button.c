#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/cpufunc.h>
#include "button.h"
#include "charger_sm.h"
#include "led.h"
#include "rtc.h"
#include "sysconfig.h"

static volatile uint16_t last_button_start_ticks = 0;
static volatile bool button_pressed = false;

static volatile bool in_config_menu = false;
static volatile bool in_config_menu_item = false;
static volatile uint8_t config_menu_index = 0;
static volatile uint8_t config_item_index = 0;
static volatile bool config_short_press_pending = false;
static volatile bool config_medium_press_pending = false;

static ButtonHandler short_press_handler = 0;

void button_init(void) {
    // Button is connected to PA4, configure as input with pull-up and interrupt on both edges
    PORTA.PIN4CTRL = PORT_INVEN_bm | PORT_PULLUPEN_bm | PORT_ISC_BOTHEDGES_gc;
}

void button_set_short_press_handler(ButtonHandler handler) {
    short_press_handler = handler;
}

static void button_config_menu_update_led(void) {
    // Update LED according to current menu item
    if (in_config_menu_item) {
        // In menu item
        led_set_blinking(false, false, true, 255, 5, 5, config_item_index + 1, 11);  // Blue blinking, N+1 x at 2 Hz with 1 second pause
    } else {
        // In main menu
        led_set_blinking(true, true, false, 255, 5, 5, config_menu_index + 1, 11);  // Yellow blinking, N+1 x at 2 Hz with 1 second pause
    }
}

bool button_handle_config_menu(void) {
    if (!in_config_menu) {
        // Only enter configuration menu if we're currently disconnected, to prevent
        // clashes with LED handling
        if (config_medium_press_pending && charger_sm_get_state() == CHARGER_DISCONNECTED) {
            in_config_menu = true;
            in_config_menu_item = false;
            config_menu_index = 0;
            config_item_index = 0;
            config_medium_press_pending = false;
            led_wakeup();
            button_config_menu_update_led();
        }
        return in_config_menu;
    }

    // Config menu items:
    // 0 - Charging current limit
    // 1 - DC input current limit
    // 2 - Charge while rig is on
    // 3 - Thermistor

    // Update LED according to current menu item
    if (in_config_menu_item) {
        // In menu item
        if (config_medium_press_pending) {
            // Leave menu item
            config_medium_press_pending = false;
            in_config_menu_item = false;
        } else if (config_short_press_pending) {
            // Advance to next item value
            config_item_index++;
            static const uint16_t current_values[] = {500, 1000, 2000, 3000};
            switch (config_menu_index) {
                case 0:
                    // Charging current limit: 500, 1000, 2000, 3000 mA
                    config_item_index %= 4;
                    sysconfig_update_word(&sysconfig->chargingCurrentLimit, current_values[config_item_index]);
                    break;
                case 1:
                    // DC input current limit: 500, 1000, 2000, 3000 mA
                    config_item_index %= 4;
                    sysconfig_update_word(&sysconfig->dcInputCurrentLimit, current_values[config_item_index]);
                    break;
                case 2:
                    // Charge while rig is on: toggle
                    config_item_index %= 2;
                    sysconfig_update_word(&sysconfig->chargeWhenRigIsOn, config_item_index);
                    break;
                case 3:
                    // Thermistor: toggle
                    config_item_index %= 2;
                    sysconfig_update_word(&sysconfig->enableThermistor, config_item_index);
                    break;
            }
            config_short_press_pending = false;
        }
    } else {
        // In main menu
        if (config_short_press_pending) {
            // Advance to next menu item
            config_menu_index = (config_menu_index + 1) % 4;
            config_short_press_pending = false;
        } else if (config_medium_press_pending) {
            // Enter selected menu item
            in_config_menu_item = true;
            config_medium_press_pending = false;

            // Update selected item according to current config
            switch (config_menu_index) {
                case 0:
                    // Charging current limit
                    if (sysconfig->chargingCurrentLimit <= 500) {
                        config_item_index = 0;
                    } else if (sysconfig->chargingCurrentLimit <= 1000) {
                        config_item_index = 1;
                    } else if (sysconfig->chargingCurrentLimit <= 2000) {
                        config_item_index = 2;
                    } else {
                        config_item_index = 3;
                    }
                    break;
                case 1:
                    // DC input current limit
                    if (sysconfig->dcInputCurrentLimit <= 500) {
                        config_item_index = 0;
                    } else if (sysconfig->dcInputCurrentLimit <= 1000) {
                        config_item_index = 1;
                    } else if (sysconfig->dcInputCurrentLimit <= 2000) {
                        config_item_index = 2;
                    } else {
                        config_item_index = 3;
                    }
                    break;
                case 2:
                    // Charge while rig is on
                    config_item_index = sysconfig->chargeWhenRigIsOn ? 1 : 0;
                    break;
                case 3:
                    // Thermistor
                    config_item_index = sysconfig->enableThermistor ? 1 : 0;
                    break;
             }  
        }
    }
    
    button_config_menu_update_led();

    return in_config_menu;
}

void button_handle_interrupt(void) {
    // Note: this function is called from an ISR context
    // Button toggled
    if ((PORTA.IN & PIN4_bm) && !button_pressed) {
        // Button pressed
        last_button_start_ticks = rtc_get_ticks();
        button_pressed = true;
    } else if (button_pressed) {
        // Button released
        uint16_t button_press_duration = rtc_get_ticks() - last_button_start_ticks;
        button_pressed = false;
        
        if (button_press_duration > 50 && button_press_duration < 1000) {
            // Short press
            if (in_config_menu) {
                config_short_press_pending = true;
            } else if (short_press_handler) {
                short_press_handler();
            }
        } else if (button_press_duration < 3000) {
            // Medium press
            config_medium_press_pending = true;
        } else {
            // Long press
            // Reset system
            ccp_write_io((void*)&(RSTCTRL.SWRR), RSTCTRL_SWRE_bm);
        }
    }
}
