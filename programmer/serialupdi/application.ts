/**
 * Application layer for UPDI stack
 */

import * as constants from "./constants.js";
import { UpdiDatalink16bit, UpdiDatalink24bit } from "./link.js";
import { UpdiPhysical } from "./physical.js";
import { UpdiReadWrite } from "./readwrite.js";
import { NvmUpdi } from "./nvm.js";
import { NvmUpdiP0 } from "./nvmp0.js";
import { Timeout } from "./timeout.js";

interface SibInfo {
  family: string;
  NVM: string;
  OCD: string;
  OSC: string;
  extra: string;
}

/**
 * Decode SIB into readable format
 * @param sib SIB data to decode
 * @returns SibInfo object or null if invalid
 */
export function decodeSib(sib: string): SibInfo | null {
  // Do some simple checks:
  try {
    // SIB should contain only ASCII characters
    // This is already a string in our implementation
  } catch {
    return null;
  }

  // Vital information is stored in the first 19 characters
  if (sib.length < 19) {
    return null;
  }

  // Parse fixed width fields according to spec
  const family = sib.substring(0, 7).trim();
  const nvm = sib.substring(8, 11).trim().split(":")[1];
  const ocd = sib.substring(11, 14).trim().split(":")[1];
  const osc = sib.substring(15, 19).trim();
  const extra = sib.substring(19).trim();

  return {
    family,
    NVM: nvm,
    OCD: ocd,
    OSC: osc,
    extra,
  };
}

/**
 * Generic application layer for UPDI
 */
export class UpdiApplication {
  private phy: UpdiPhysical;
  private readwrite: UpdiReadWrite | null = null;
  private nvm: NvmUpdi | null = null;
  private device: any;

  /**
   * Create an UPDI application instance
   * @param serialport serial port to communicate over
   * @param baud baud rate to use
   * @param device device information
   * @param timeout read timeout for serial port in seconds
   */
  constructor(
    serialport: SerialPort,
    baud: number,
    device?: any,
    timeout?: number
  ) {
    this.device = device;

    // Build the UPDI stack:
    // Create a physical
    this.phy = new UpdiPhysical(serialport, baud, timeout);
  }

  async init(): Promise<void> {
    await this.phy.waitForInit();

    // Create a DL - use 24-bit until otherwise known
    let datalink = new UpdiDatalink24bit();

    // Set the physical for use in the datalink
    datalink.setPhysical(this.phy);

    // Init (active) the datalink - must be called async later
    await datalink.initDatalink();

    // Create a read write access layer using this data link
    this.readwrite = new UpdiReadWrite(datalink);

    // Create an NVM driver
    this.nvm = new NvmUpdi(this.readwrite, this.device);
  }

  /**
   * Reads out device information from various sources
   * @returns Device information decoded from SIB
   */
  async readDeviceInfo(): Promise<SibInfo | null> {
    const sib = await this.readwrite!.readSib();
    let sibInfo = decodeSib(sib);

    // Unable to read SIB?
    if (sibInfo === null) {
      // Send double break and try again
      await this.phy.sendDoubleBreak();
      const sibRetry = await this.readwrite!.readSib();
      sibInfo = decodeSib(sibRetry);
      if (sibInfo === null) {
        throw new Error("Failed to read device info.");
      }
    }

    // Select correct NVM driver:
    // P:0 = tiny0, 1, 2; mega0 (16-bit, page oriented)
    if (sibInfo.NVM === "0") {
      // Original UPDI, switch to 16-bit DL
      const datalink = new UpdiDatalink16bit();
      datalink.setPhysical(this.phy);
      await datalink.initDatalink();
      this.readwrite = new UpdiReadWrite(datalink);
      this.nvm = new NvmUpdiP0(this.readwrite!, this.device);
    } else {
      throw new Error("Unsupported NVM revision");
    }

    if (await this.inProgMode()) {
      if (this.device !== null) {
        const devid = await this.readData(this.device.sigrowAddress, 3);
        const devrev = await this.readData(this.device.syscfgAddress + 1, 1);
      }
    }

    return sibInfo;
  }

  /**
   * Reads a number of bytes of data from UPDI
   * @param address address to read from
   * @param size number of bytes to read
   * @returns data requested
   */
  async readData(address: number, size: number): Promise<Uint8Array> {
    return await this.readwrite!.readData(address, size);
  }

  /**
   * Reads a number of words of data from UPDI
   * @param address address to read from
   * @param words number of words to read
   * @returns data requested
   */
  async readDataWords(address: number, words: number): Promise<Uint8Array> {
    return await this.readwrite!.readDataWords(address, words);
  }

  /**
   * Writes a number of words to memory
   * @param address address to write to
   * @param data data to write
   */
  async writeDataWords(address: number, data: Uint8Array): Promise<void> {
    await this.readwrite!.writeDataWords(address, data);
  }

  /**
   * Writes a number of bytes to memory
   * @param address address to write to
   * @param data data to write
   */
  async writeData(address: number, data: Uint8Array): Promise<void> {
    await this.readwrite!.writeData(address, data);
  }

  /**
   * Checks whether the NVM PROG flag is up
   * @returns True if in NVM PROG, False otherwise
   */
  async inProgMode(): Promise<boolean> {
    if (
      await this.readwrite!.readCs(constants.UPDI_ASI_SYS_STATUS) &
      (1 << constants.UPDI_ASI_SYS_STATUS_NVMPROG)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Waits for the device to be unlocked.
   * All devices boot up as locked until proven otherwise.
   * @param timeoutMs number of milliseconds to wait
   * @returns True if success, False otherwise
   */
  async waitUnlocked(timeoutMs: number): Promise<boolean> {
    const timeout = new Timeout(timeoutMs);

    while (!timeout.expired()) {
      if (
        !(
          await this.readwrite!.readCs(constants.UPDI_ASI_SYS_STATUS) &
          (1 << constants.UPDI_ASI_SYS_STATUS_LOCKSTATUS)
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Waits for the device to be in user row write mode.
   * User row is writeable on a locked device using this mechanism.
   * @param timeoutMs number of milliseconds to wait
   * @param waitForHigh set True to wait for bit to go high; False to wait for low
   * @returns True if success, False otherwise
   */
  async waitUrowProg(timeoutMs: number, waitForHigh: boolean): Promise<boolean> {
    const timeout = new Timeout(timeoutMs);

    while (!timeout.expired()) {
      const status = await this.readwrite!.readCs(constants.UPDI_ASI_SYS_STATUS);
      if (waitForHigh) {
        if (status & (1 << constants.UPDI_ASI_SYS_STATUS_UROWPROG)) {
          return true;
        }
      } else {
        if (!(status & (1 << constants.UPDI_ASI_SYS_STATUS_UROWPROG))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Unlock by chip erase
   */
  async unlock(): Promise<void> {
    // Put in the key
    await this.readwrite!.writeKey(
      constants.UPDI_KEY_64,
      constants.UPDI_KEY_CHIPERASE
    );

    // Check key status
    const keyStatus = await this.readwrite!.readCs(constants.UPDI_ASI_KEY_STATUS);

    if (
      !(
        keyStatus &
        (1 << constants.UPDI_ASI_KEY_STATUS_CHIPERASE)
      )
    ) {
      throw new Error("Key not accepted");
    }

    // Toggle reset
    await this.reset(true);
    await this.reset(false);

    // And wait for unlock
    if (!await this.waitUnlocked(500)) {
      throw new Error("Failed to chip erase using key");
    }
  }

  /**
   * Writes data to the user row when the device is locked, using a key.
   * @param address address to write to
   * @param data data to write
   */
  async writeUserRowLockedDevice(address: number, data: Uint8Array): Promise<void> {
    // Put in the key
    await this.readwrite!.writeKey(constants.UPDI_KEY_64, constants.UPDI_KEY_UROW);

    // Check key status
    const keyStatus = await this.readwrite!.readCs(constants.UPDI_ASI_KEY_STATUS);

    if (
      !(
        keyStatus &
        (1 << constants.UPDI_ASI_KEY_STATUS_UROWWRITE)
      )
    ) {
      throw new Error("Key not accepted");
    }

    // Toggle reset
    await this.reset(true);
    await this.reset(false);

    // Wait for mode to be entered
    if (!await this.waitUrowProg(500, true)) {
      throw new Error("Failed to enter UROW write mode using key");
    }

    // At this point we can write one 'page' to the device, and have it transferred into the user row
    // Transfer data
    await this.readwrite!.writeData(address, data);

    // Finalize
    await this.readwrite!.writeCs(
      constants.UPDI_ASI_SYS_CTRLA,
      (1 << constants.UPDI_ASI_SYS_CTRLA_UROW_FINAL) |
        (1 << constants.UPDI_CTRLB_CCDETDIS_BIT)
    );

    // Wait for mode to be exited
    if (!await this.waitUrowProg(500, false)) {
      // Toggle reset
      await this.reset(true);
      await this.reset(false);
      throw new Error("Failed to exit UROW write mode");
    }

    // Clear status
    await this.readwrite!.writeCs(
      constants.UPDI_ASI_KEY_STATUS,
      (1 << constants.UPDI_ASI_KEY_STATUS_UROWWRITE) |
        (1 << constants.UPDI_CTRLB_CCDETDIS_BIT)
    );

    // Toggle reset
    await this.reset(true);
    await this.reset(false);
  }

  /**
   * Enters into NVM programming mode
   */
  async enterProgmode(): Promise<boolean> {
    // First check if NVM is already enabled
    if (await this.inProgMode()) {
      return true;
    }

    // Hold part in reset
    await this.reset(true);

    // Put in the key
    await this.readwrite!.writeKey(constants.UPDI_KEY_64, constants.UPDI_KEY_NVM);

    // Check key status
    const keyStatus = await this.readwrite!.readCs(constants.UPDI_ASI_KEY_STATUS);

    if (
      !(
        keyStatus &
        (1 << constants.UPDI_ASI_KEY_STATUS_NVMPROG)
      )
    ) {
      throw new Error("Key not accepted");
    }

    // Toggle reset
    await this.reset(true);
    await this.reset(false);

    // And wait for unlock
    if (!await this.waitUnlocked(100)) {
      throw new Error(
        "Failed to enter NVM programming mode: device is locked"
      );
    }

    // Check for NVMPROG flag
    if (!await this.inProgMode()) {
      throw new Error("Failed to enter NVM programming mode");
    }

    return true;
  }

  /**
   * Disables UPDI which releases any keys enabled
   */
  async leaveProgmode(): Promise<void> {
    await this.reset(true);
    await this.reset(false);
    await this.readwrite!.writeCs(
      constants.UPDI_CS_CTRLB,
      (1 << constants.UPDI_CTRLB_UPDIDIS_BIT) |
        (1 << constants.UPDI_CTRLB_CCDETDIS_BIT)
    );
  }

  /**
   * Applies or releases an UPDI reset condition
   * @param applyReset True to apply, False to release
   */
  async reset(applyReset: boolean): Promise<void> {
    if (applyReset) {
      await this.readwrite!.writeCs(
        constants.UPDI_ASI_RESET_REQ,
        constants.UPDI_RESET_REQ_VALUE
      );
    } else {
      await this.readwrite!.writeCs(constants.UPDI_ASI_RESET_REQ, 0x00);
    }
  }

  /**
   * Write data to flash memory
   * @param address address to write to
   * @param data data to write
   */
  async writeFlash(address: number, data: Uint8Array): Promise<void> {
    if (!this.nvm) {
      throw new Error('NVM driver not initialized');
    }
    await this.nvm.writeFlash(address, data);
  }

  /**
   * Write data to EEPROM
   * @param address address to write to
   * @param data data to write
   */
  async writeEeprom(address: number, data: Uint8Array): Promise<void> {
    if (!this.nvm) {
      throw new Error('NVM driver not initialized');
    }
    await this.nvm.writeEeprom(address, data);
  }

  /**
   * Write data to user row
   * @param address address to write to
   * @param data data to write
   */
  async writeUserRow(address: number, data: Uint8Array): Promise<void> {
    if (!this.nvm) {
      throw new Error('NVM driver not initialized');
    }
    await this.nvm.writeUserRow(address, data);
  }
}
