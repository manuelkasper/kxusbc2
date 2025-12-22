/**
 * Link layer in UPDI protocol stack
 */

import * as constants from "./constants.js";
import { UpdiPhysical } from "./physical.js";

/**
 * UPDI data link class handles the UPDI data protocol within the device
 */
export class UpdiDatalink {
  protected LDCS_RESPONSE_BYTES = 1;
  protected updiPhy: UpdiPhysical | null = null;

  /**
   * Inject a serial-port based physical layer for use by this DL
   * @param physical physical object to use
   */
  setPhysical(physical: UpdiPhysical): void {
    this.updiPhy = physical;
  }

  /**
   * Set the inter-byte delay bit and disable collision detection
   */
  private async initSessionParameters(): Promise<void> {
    await this.stcs(
      constants.UPDI_CS_CTRLB,
      1 << constants.UPDI_CTRLB_CCDETDIS_BIT
    );
    await this.enableAck();
  }

  /**
   * Disables ACKs on write to reduce latency for writing blocks
   */
  private async disableAck(): Promise<void> {
    await this.stcs(
      constants.UPDI_CS_CTRLA,
      (1 << constants.UPDI_CTRLA_IBDLY_BIT) |
        (1 << constants.UPDI_CTRLA_RSD_BIT)
    );
  }

  /**
   * Enables ACKs on write by default
   */
  private async enableAck(): Promise<void> {
    await this.stcs(constants.UPDI_CS_CTRLA, 1 << constants.UPDI_CTRLA_IBDLY_BIT);
  }

  /**
   * Init DL layer
   */
  async initDatalink(): Promise<void> {
    await this.initSessionParameters();
    if (!await this.checkDatalink()) {
      if (this.updiPhy) {
        await this.updiPhy.sendDoubleBreak();
      }
      await this.initSessionParameters();
      if (!await this.checkDatalink()) {
        throw new Error("UPDI initialisation failed");
      }
    }
  }

  /**
   * Check UPDI by loading CS STATUSA
   * @returns True if OK, False otherwise
   */
  private async checkDatalink(): Promise<boolean> {
    try {
      if (await this.ldcs(constants.UPDI_CS_STATUSA) !== 0) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Load data from Control/Status space
   * @param address address to load
   */
  async ldcs(address: number): Promise<number> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LDCS | (address & 0x0f),
    ]));
    const response = await this.updiPhy.receive(this.LDCS_RESPONSE_BYTES);
    if (response.length !== this.LDCS_RESPONSE_BYTES) {
      throw new Error(
        `Unexpected number of bytes in response: ${response.length} byte(s), expected ${this.LDCS_RESPONSE_BYTES} byte(s)`
      );
    }
    return response[0];
  }

  /**
   * Store a value to Control/Status space
   * @param address address to store to
   * @param value value to write
   */
  async stcs(address: number, value: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_STCS | (address & 0x0f),
      value,
    ]));
  }

  /**
   * Loads a number of bytes from the pointer location with pointer post-increment
   * @param size number of bytes to load
   * @return values read
   */
  async ldPtrInc(size: number): Promise<Uint8Array> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LD | constants.UPDI_PTR_INC | constants.UPDI_DATA_8,
    ]));
    return await this.updiPhy.receive(size);
  }

  /**
   * Load a 16-bit word value from the pointer location with pointer post-increment
   * @param words number of words to load
   * @return values read
   */
  async ldPtrInc16(words: number): Promise<Uint8Array> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LD | constants.UPDI_PTR_INC | constants.UPDI_DATA_16,
    ]));
    return await this.updiPhy.receive(words << 1);
  }

  /**
   * Store data to the pointer location with pointer post-increment
   * @param data data to store
   */
  async stPtrInc(data: Uint8Array): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_ST | constants.UPDI_PTR_INC | constants.UPDI_DATA_8,
      data[0],
    ]));
    const response = await this.updiPhy.receive(1);

    if (response.length !== 1 || response[0] !== constants.UPDI_PHY_ACK) {
      throw new Error("ACK error with st_ptr_inc");
    }

    let num = 1;
    while (num < data.length) {
      await this.updiPhy.send(new Uint8Array([data[num]]));
      const ackResponse = await this.updiPhy.receive(1);

      if (
        ackResponse.length !== 1 ||
        ackResponse[0] !== constants.UPDI_PHY_ACK
      ) {
        throw new Error("Error with st_ptr_inc");
      }
      num += 1;
    }
  }

  /**
   * Store a 16-bit word value to the pointer location with pointer post-increment.
   * ACK is disabled for blocks (> 2 bytes)
   * @param data data to store
   */
  async stPtrInc16(data: Uint8Array): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    if (data.length === 2) {
      // ACKed mode used for 2-byte transfers
      await this.updiPhy.send(new Uint8Array([
        constants.UPDI_PHY_SYNC,
        constants.UPDI_ST | constants.UPDI_PTR_INC | constants.UPDI_DATA_16,
        data[0],
        data[1],
      ]));
      const response = await this.updiPhy.receive(1);

      if (response.length !== 1 || response[0] !== constants.UPDI_PHY_ACK) {
        throw new Error("ACK error with st_ptr_inc16");
      }
    } else {
      // ACKless block write
      await this.disableAck();
      await this.updiPhy.send(new Uint8Array([
        constants.UPDI_PHY_SYNC,
        constants.UPDI_ST | constants.UPDI_PTR_INC | constants.UPDI_DATA_16,
      ]));
      await this.updiPhy.send(new Uint8Array(data));
      await this.enableAck();
    }
  }

  /**
   * Store a value to the repeat counter
   * @param repeats number of repeats requested
   */
  async repeat(repeats: number): Promise<void> {
    if (repeats - 1 > constants.UPDI_MAX_REPEAT_SIZE) {
      throw new Error("Invalid repeat count!");
    }
    repeats -= 1;
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_REPEAT | constants.UPDI_REPEAT_BYTE,
      repeats & 0xff,
    ]));
  }

  /**
   * Read the SIB
   * @returns SIB string
   */
  async readSib(): Promise<string> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    const sibData = await this.updiPhy.sib();
    return Array.from(sibData).map(b => String.fromCharCode(b)).join('');
  }

  /**
   * Write a key
   * @param size size of key (0=64B, 1=128B, 2=256B)
   * @param key key value
   */
  async key(size: number, key: string | Uint8Array): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    const keyArray = typeof key === "string" ? key.split("").map((c) => c.charCodeAt(0)) : key;
    if (keyArray.length !== 8 << size) {
      throw new Error("Invalid KEY length!");
    }
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_KEY | constants.UPDI_KEY_KEY | size,
    ]));
    await this.updiPhy.send(new Uint8Array(keyArray.reverse()));
  }

  /**
   * Load a single byte direct from an address
   * @param address address to load from
   * @return value read
   */
  async ld(address: number): Promise<number> {
    throw new Error("ld() must be implemented in subclass");
  }

  /**
   * Load a 16-bit word directly from an address
   * @param address address to load from
   * @return values read
   */
  async ld16(address: number): Promise<Uint8Array> {
    throw new Error("ld16() must be implemented in subclass");
  }

  /**
   * Store a single byte value directly to an address
   * @param address address to write to
   * @param value value to write
   */
  async st(address: number, value: number): Promise<void> {
    throw new Error("st() must be implemented in subclass");
  }

  /**
   * Store a 16-bit word value directly to an address
   * @param address address to write to
   * @param value value to write
   */
  async st16(address: number, value: number): Promise<void> {
    throw new Error("st16() must be implemented in subclass");
  }

  /**
   * Set the pointer location
   * @param address address to write
   */
  async stPtr(address: number): Promise<void> {
    throw new Error("stPtr() must be implemented in subclass");
  }

  /**
   * Performs data phase of transaction:
   * * receive ACK
   * * send data
   * @param values value(s) to send
   */
  protected async stDataPhase(values: Uint8Array): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    const response = await this.updiPhy.receive(1);
    if (response.length !== 1 || response[0] !== constants.UPDI_PHY_ACK) {
      throw new Error("Error with st");
    }

    await this.updiPhy.send(new Uint8Array(values));
    const ackResponse = await this.updiPhy.receive(1);
    if (ackResponse.length !== 1 || ackResponse[0] !== constants.UPDI_PHY_ACK) {
      throw new Error("Error with st");
    }
  }
}

/**
 * UPDI data link layer in 16-bit version.
 * This means that all addresses and pointers contain 2 bytes.
 */
export class UpdiDatalink16bit extends UpdiDatalink {
  /**
   * Load a single byte direct from a 16-bit address
   * @param address address to load from
   * @return value read
   */
  async ld(address: number): Promise<number> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LDS | constants.UPDI_ADDRESS_16 | constants.UPDI_DATA_8,
      address & 0xff,
      (address >> 8) & 0xff,
    ]));
    const response = await this.updiPhy.receive(1);
    return response[0];
  }

  /**
   * Load a 16-bit word directly from a 16-bit address
   * @param address address to load from
   * @return values read
   */
  async ld16(address: number): Promise<Uint8Array> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LDS | constants.UPDI_ADDRESS_16 | constants.UPDI_DATA_16,
      address & 0xff,
      (address >> 8) & 0xff,
    ]));
    return await this.updiPhy.receive(2);
  }

  /**
   * Store a single byte value directly to a 16-bit address
   * @param address address to write to
   * @param value value to write
   */
  async st(address: number, value: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_STS | constants.UPDI_ADDRESS_16 | constants.UPDI_DATA_8,
      address & 0xff,
      (address >> 8) & 0xff,
    ]));
    await this.stDataPhase(new Uint8Array([value & 0xff]));
  }

  /**
   * Store a 16-bit word value directly to a 16-bit address
   * @param address address to write to
   * @param value value to write
   */
  async st16(address: number, value: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_STS | constants.UPDI_ADDRESS_16 | constants.UPDI_DATA_16,
      address & 0xff,
      (address >> 8) & 0xff,
    ]));
    await this.stDataPhase(new Uint8Array([value & 0xff, (value >> 8) & 0xff]));
  }

  /**
   * Set the pointer location
   * @param address address to write
   */
  async stPtr(address: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_ST | constants.UPDI_PTR_ADDRESS | constants.UPDI_DATA_16,
      address & 0xff,
      (address >> 8) & 0xff,
    ]));
    const response = await this.updiPhy.receive(1);
    if (response.length !== 1 || response[0] !== constants.UPDI_PHY_ACK) {
      throw new Error("Error with st_ptr");
    }
  }
}

/**
 * UPDI data link layer in 24-bit version.
 * This means that all addresses and pointers contain 3 bytes
 */
export class UpdiDatalink24bit extends UpdiDatalink {
  /**
   * Load a single byte direct from a 24-bit address
   * @param address address to load from
   * @return value read
   */
  async ld(address: number): Promise<number> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LDS | constants.UPDI_ADDRESS_24 | constants.UPDI_DATA_8,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
    ]));
    const response = await this.updiPhy.receive(1);
    return response[0];
  }

  /**
   * Load a 16-bit word directly from a 24-bit address
   * @param address address to load from
   * @return values read
   */
  async ld16(address: number): Promise<Uint8Array> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_LDS | constants.UPDI_ADDRESS_24 | constants.UPDI_DATA_16,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
    ]));
    return await this.updiPhy.receive(2);
  }

  /**
   * Store a single byte value directly to a 24-bit address
   * @param address address to write to
   * @param value value to write
   */
  async st(address: number, value: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_STS | constants.UPDI_ADDRESS_24 | constants.UPDI_DATA_8,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
    ]));
    await this.stDataPhase(new Uint8Array([value & 0xff]));
  }

  /**
   * Store a 16-bit word value directly to a 24-bit address
   * @param address address to write to
   * @param value value to write
   */
  async st16(address: number, value: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_STS | constants.UPDI_ADDRESS_24 | constants.UPDI_DATA_16,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
    ]));
    await this.stDataPhase(new Uint8Array([value & 0xff, (value >> 8) & 0xff]));
  }

  /**
   * Set the pointer location
   * @param address address to write
   */
  async stPtr(address: number): Promise<void> {
    if (!this.updiPhy) throw new Error("Physical layer not initialized");
    await this.updiPhy.send(new Uint8Array([
      constants.UPDI_PHY_SYNC,
      constants.UPDI_ST | constants.UPDI_PTR_ADDRESS | constants.UPDI_DATA_24,
      address & 0xff,
      (address >> 8) & 0xff,
      (address >> 16) & 0xff,
    ]));
    const response = await this.updiPhy.receive(1);
    if (response.length !== 1 || response[0] !== constants.UPDI_PHY_ACK) {
      throw new Error("Error with st_ptr");
    }
  }
}
