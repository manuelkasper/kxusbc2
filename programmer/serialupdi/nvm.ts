/**
 * NVM implementations on various UPDI device families
 */

import { UpdiReadWrite } from "./readwrite.js";

/**
 * Base class for NVM
 */
export class NvmUpdi {
  protected readwrite: UpdiReadWrite;
  protected device: any;

  constructor(readwrite: UpdiReadWrite, device?: any) {
    this.readwrite = readwrite;
    this.device = device;
  }

  /**
   * Does a chip erase using the NVM controller
   */
  async chipErase(): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Erasing single flash page using the NVM controller
   * @param address Start address of page to erase
   */
  async eraseFlashPage(address: number): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Erase EEPROM memory only
   */
  async eraseEeprom(): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Erase User Row memory only
   * @param address Start address of user row
   * @param size Size of user row
   */
  async eraseUserRow(address: number, size: number): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Writes data to flash
   * @param address address to write to
   * @param data data to write
   */
  async writeFlash(address: number, data: Uint8Array): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Writes data to user row
   * @param address address to write to
   * @param data data to write
   */
  async writeUserRow(address: number, data: Uint8Array): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Write data to EEPROM
   * @param address address to write to
   * @param data data to write
   */
  async writeEeprom(address: number, data: Uint8Array): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Writes one fuse value
   * @param address address to write to
   * @param data data to write
   */
  async writeFuse(address: number, data: Uint8Array): Promise<void> {
    throw new Error("Not implemented");
  }
}
