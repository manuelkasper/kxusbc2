// This file contains the device specifications for the KXUSBC2 programmer

export interface DeviceInfo {
  eeprom_address?: number;
  eeprom_size?: number;
  eeprom_page_size?: number;
  eeprom_read_size?: number;
  eeprom_write_size?: number;
  flash_address?: number;
  flash_size?: number;
  flash_page_size?: number;
  flash_read_size?: number;
  flash_write_size?: number;
  user_row_address?: number;
  user_row_size?: number;
  user_row_page_size?: number;
  user_row_read_size?: number;
  user_row_write_size?: number;
  device_id?: number;
}

/**
 * KXUSBC2 target device: ATtiny3226
 */
export const ATTINY3226_DEVICE: DeviceInfo = {
  device_id: 0x1E9527,
  eeprom_address: 0x00001400,
  eeprom_size: 0x0100,
  eeprom_page_size: 0x40,
  eeprom_read_size: 0x01,
  eeprom_write_size: 0x01,
  flash_address: 0x00008000,
  flash_size: 0x8000,
  flash_page_size: 0x80,
  flash_read_size: 0x02,
  flash_write_size: 0x80,
  user_row_address: 0x1300,
  user_row_size: 0x20,
  user_row_page_size: 0x01,
  user_row_read_size: 0x01,
  user_row_write_size: 0x01,
};
