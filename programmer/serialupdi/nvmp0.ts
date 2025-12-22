/**
 * NVM controller implementation for P:0.
 * Present on tiny0, 1, 2 and mega0 (e.g: tiny817 -> mega4809)
 */

import { NvmUpdi } from "./nvm.js";
import { UpdiReadWrite } from "./readwrite.js";
import { Timeout } from "./timeout.js";

/**
 * Version P:0 UPDI NVM properties
 */
export class NvmUpdiP0 extends NvmUpdi {
  // NVM CTRL peripheral definition
  static readonly NVMCTRL_CTRLA = 0x00;
  static readonly NVMCTRL_CTRLB = 0x01;
  static readonly NVMCTRL_STATUS = 0x02;
  static readonly NVMCTRL_INTCTRL = 0x03;
  static readonly NVMCTRL_INTFLAGS = 0x04;
  static readonly NVMCTRL_DATA = 0x06; // 16-bit
  static readonly NVMCTRL_ADDR = 0x08; // 16-bit

  // CTRLA commands
  static readonly NVMCMD_NOP = 0x00;
  static readonly NVMCMD_WRITE_PAGE = 0x01;
  static readonly NVMCMD_ERASE_PAGE = 0x02;
  static readonly NVMCMD_ERASE_WRITE_PAGE = 0x03;
  static readonly NVMCMD_PAGE_BUFFER_CLR = 0x04;
  static readonly NVMCMD_CHIP_ERASE = 0x05;
  static readonly NVMCMD_ERASE_EEPROM = 0x06;
  static readonly NVMCMD_WRITE_FUSE = 0x07;

  // STATUS
  static readonly STATUS_WRITE_ERROR_bp = 2;
  static readonly STATUS_EEPROM_BUSY_bp = 1;
  static readonly STATUS_FLASH_BUSY_bp = 0;

  constructor(readwrite: UpdiReadWrite, device?: any) {
    super(readwrite, device);
  }

  async chipErase(): Promise<void> {
    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready before chip erase"
      );
    }

    await this.executeNvmCommand(NvmUpdiP0.NVMCMD_CHIP_ERASE);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after chip erase"
      );
    }
  }

  async eraseFlashPage(address: number): Promise<void> {
    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready before flash page erase"
      );
    }

    await this.readwrite.writeData(address, new Uint8Array([0xff]));
    await this.executeNvmCommand(NvmUpdiP0.NVMCMD_ERASE_PAGE);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after flash page erase"
      );
    }
  }

  async eraseEeprom(): Promise<void> {
    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready before EEPROM erase"
      );
    }

    await this.executeNvmCommand(NvmUpdiP0.NVMCMD_ERASE_EEPROM);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after EEPROM erase"
      );
    }
  }

  async eraseUserRow(address: number, size: number): Promise<void> {
    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready before user row erase"
      );
    }

    // On this NVM version user row is implemented as EEPROM
    // When erasing single EEPROM pages a dummy write is needed for each location to be erased
    for (let offset = 0; offset < size; offset++) {
      await this.readwrite.writeData(address + offset, new Uint8Array([0xff]));
    }

    await this.executeNvmCommand(NvmUpdiP0.NVMCMD_ERASE_PAGE);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after user row erase"
      );
    }
  }

  async writeFlash(address: number, data: Uint8Array): Promise<void> {
    await this.writeNvm(address, data, true);
  }

  async writeUserRow(address: number, data: Uint8Array): Promise<void> {
    // On this NVM variant user row is implemented as EEPROM
    await this.writeEeprom(address, data);
  }

  async writeEeprom(address: number, data: Uint8Array): Promise<void> {
    await this.writeNvm(address, data, false, NvmUpdiP0.NVMCMD_ERASE_WRITE_PAGE);
  }

  async writeFuse(address: number, data: Uint8Array): Promise<void> {
    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready before fuse write"
      );
    }

    // Write address to NVMCTRL ADDR
    await this.readwrite.writeByte(
      this.device.nvmctrlAddress + NvmUpdiP0.NVMCTRL_ADDR,
      address & 0xff
    );
    await this.readwrite.writeByte(
      this.device.nvmctrlAddress + NvmUpdiP0.NVMCTRL_ADDR + 1,
      (address >> 8) & 0xff
    );

    // Write data
    await this.readwrite.writeByte(
      this.device.nvmctrlAddress + NvmUpdiP0.NVMCTRL_DATA,
      data[0] & 0xff
    );

    // Execute
    await this.executeNvmCommand(NvmUpdiP0.NVMCMD_WRITE_FUSE);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after fuse write"
      );
    }
  }

  private async writeNvm(
    address: number,
    data: Uint8Array,
    useWordAccess: boolean,
    nvmcommand: number = NvmUpdiP0.NVMCMD_WRITE_PAGE
  ): Promise<void> {
    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready before page buffer clear"
      );
    }

    // Clear the page buffer
    await this.executeNvmCommand(NvmUpdiP0.NVMCMD_PAGE_BUFFER_CLR);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after page buffer clear"
      );
    }

    // Load the page buffer by writing directly to location
    if (useWordAccess) {
      await this.readwrite.writeDataWords(address, data);
    } else {
      await this.readwrite.writeData(address, data);
    }

    // Write the page to NVM, maybe erase first
    await this.executeNvmCommand(nvmcommand);

    if (!await this.waitNvmReady()) {
      throw new Error(
        "Timeout waiting for NVM controller to be ready after page write"
      );
    }
  }

  private async waitNvmReady(timeoutMs: number = 100): Promise<boolean> {
    const timeout = new Timeout(timeoutMs);

    while (!timeout.expired()) {
      const status = await this.readwrite.readByte(
        this.device.nvmctrlAddress + NvmUpdiP0.NVMCTRL_STATUS
      );
      if (status & (1 << NvmUpdiP0.STATUS_WRITE_ERROR_bp)) {
        throw new Error("NVM error");
      }

      if (
        !(
          status &
          ((1 << NvmUpdiP0.STATUS_EEPROM_BUSY_bp) |
            (1 << NvmUpdiP0.STATUS_FLASH_BUSY_bp))
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private async executeNvmCommand(command: number): Promise<void> {
    await this.readwrite.writeByte(
      this.device.nvmctrlAddress + NvmUpdiP0.NVMCTRL_CTRLA,
      command
    );
  }
}
