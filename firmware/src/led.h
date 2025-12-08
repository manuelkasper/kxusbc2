#pragma once

void led_init(void);
void led_set_color(uint8_t red, uint8_t green, uint8_t blue);
void led_set_blinking(bool red, bool green, bool blue, uint8_t pwm, uint8_t t_on, uint8_t t_off, uint8_t count, uint8_t pause);
void led_stop_blinking(void);
void led_shutdown(void);
void led_wakeup(void);
