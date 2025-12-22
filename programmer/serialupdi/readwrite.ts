/**
 * Read/write access provider for UPDI
 */

import * as constants from "./constants.js";
import { UpdiDatalink } from "./link.js";

/**
 * Provides various forms of reads and writes for UPDI applications
 * Makes use of the datalink provided
 */
export class UpdiReadWrite {
  private datalink: UpdiDatalink;

  constructor(datalink: UpdiDatalink) {
    this.datalink = datalink;
  }

  /**
   * Read from Control/Status space
   * @param address address (index) to read
   * @return value read
   */
  async readCs(address: number): Promise<number> {
    return await this.datalink.ldcs(address);
  }

  /**
   * Write to Control/Status space
   * @param address address (index) to write
   * @param value 8-bit value to write
   */
  async writeCs(address: number, value: number): Promise<void> {
    await this.datalink.stcs(address, value);
  }

  /**
   * Write a KEY into UPDI
   * @param size size of key to send
   * @param key key value
   */
  async writeKey(size: number, key: string | Uint8Array): Promise<void> {
    await this.datalink.key(size, key);
  }

  /**
   * Read the SIB from UPDI
   * @return SIB string read
   */
  async readSib(): Promise<string> {
    return await this.datalink.readSib();
  }

  /**
   * Read a single byte from UPDI
   * @param address address to read from
   * @return value read
   */
  async readByte(address: number): Promise<number> {
    return await this.datalink.ld(address);
  }

  /**
   * Writes a single byte to UPDI
   * @param address address to write to
   * @param value value to write
   */
  async writeByte(address: number, value: number): Promise<void> {
    await this.datalink.st(address, value);
  }

  /**
   * Reads a number of bytes of data from UPDI
   * @param address address to read from
   * @param size number of bytes to read
   */
  async readData(address: number, size: number): Promise<Uint8Array> {
    // Range check
    if (size > constants.UPDI_MAX_REPEAT_SIZE) {
      throw new Error(
        `UPDI cannot read ${size} bytes in one go`
      );
    }

    // Store the address
    await this.datalink.stPtr(address);

    // Fire up the repeat
    if (size > 1) {
      await this.datalink.repeat(size);
    }

    // Do the read(s)
    return await this.datalink.ldPtrInc(size);
  }

  /**
   * Reads a number of words of data from UPDI
   * @param address address to read from
   * @param words number of words to read
   */
  async readDataWords(address: number, words: number): Promise<Uint8Array> {
    // Range check
    if (words > constants.UPDI_MAX_REPEAT_SIZE >> 1) {
      throw new Error(
        `UPDI cannot read ${words} words in one go`
      );
    }

    // Store the address
    await this.datalink.stPtr(address);

    // Fire up the repeat
    if (words > 1) {
      await this.datalink.repeat(words);
    }

    // Do the read
    return await this.datalink.ldPtrInc16(words);
  }

  /**
   * Writes a number of words to memory
   * @param address address to write to
   * @param data data to write
   */
  async writeDataWords(address: number, data: Uint8Array): Promise<void> {
    const numbytes = data.length;

    // Special case of 1 word
    if (numbytes === 2) {
      const value = data[0] + (data[1] << 8);
      await this.datalink.st16(address, value);
      return;
    }

    // Range check
    if (numbytes > constants.UPDI_MAX_REPEAT_SIZE << 1) {
      throw new Error(
        `UPDI cannot write ${numbytes} bytes in one go`
      );
    }

    // Store the address
    await this.datalink.stPtr(address);

    // Fire up the repeat
    await this.datalink.repeat(numbytes >> 1);
    await this.datalink.stPtrInc16(data);
  }

  /**
   * Writes a number of bytes to memory
   * @param address address to write to
   * @param data data to write
   */
  async writeData(address: number, data: Uint8Array): Promise<void> {
    let numbytes = data.length;

    // Special case of 1 byte
    if (numbytes === 1) {
      await this.datalink.st(address, data[0]);
      return;
    }

    // Special case of 2 bytes
    if (numbytes === 2) {
      await this.datalink.st(address, data[0]);
      await this.datalink.st(address + 1, data[1]);
      return;
    }

    let index = 0;
    while (numbytes) {
      let chunkSize: number;
      if (numbytes > constants.UPDI_MAX_REPEAT_SIZE) {
        chunkSize = constants.UPDI_MAX_REPEAT_SIZE;
      } else {
        chunkSize = numbytes;
      }

      // Store the address
      await this.datalink.stPtr(address);

      // Fire up the repeat
      await this.datalink.repeat(chunkSize);
      await this.datalink.stPtrInc(data.slice(index, index + chunkSize));

      index += chunkSize;
      address += chunkSize;
      numbytes -= chunkSize;
    }
  }
}
