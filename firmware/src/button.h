/* User button handling */
#pragma once

#include <stdint.h>
#include <stdbool.h>

typedef void (*ButtonHandler)(void);

void button_init(void);
void button_handle_interrupt(void);
uint16_t button_get_last_press_duration(void);
void button_set_short_press_handler(ButtonHandler handler);

// Returns true if in config menu
bool button_handle_config_menu(void);
