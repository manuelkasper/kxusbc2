#pragma once

void led_init(void);
void led_off(void);
void led_set_color(bool red, bool green, bool blue, uint8_t brightness);
void led_set_blinking(bool red, bool green, bool blue, uint8_t brightness, uint8_t t_on, uint8_t t_off, uint8_t count, uint8_t pause);
void led_set_breathing(bool red, bool green, bool blue, uint8_t brightness, uint8_t speed);
void led_shutdown(void);
void led_wakeup(void);
