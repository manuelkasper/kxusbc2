/**
 * Serial driver for UPDI stack
 */

import * as constants from "./constants.js";

const DEFAULT_SERIALUPDI_BAUD = 115200;

/**
 * PDI physical driver using a given serial port at a given baud
 */
export class UpdiPhysical {
  private ibdly: number = 0.0001;
  private port: SerialPort;
  private baud: number;
  private timeout: number;
  private ser: any = null;
  private initPromise: Promise<void>;

  /**
   * Serial port physical interface for UPDI
   * @param port Serial port name to connect to
   * @param baud baud rate in bps to use for communications
   * @param timeout timeout value for serial reading
   */
  constructor(
    port: SerialPort,
    baud?: number,
    timeout?: number
  ) {
    this.port = port;
    this.baud = baud ?? DEFAULT_SERIALUPDI_BAUD;
    this.timeout = timeout ?? 1000;

    this.initPromise = this.initializePort();
  }

  /**
   * Wait for the port to be initialized
   */
  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Initialize the port asynchronously
   */
  private async initializePort(): Promise<void> {
    try {
      await this.initialiseSerial();
      await this.sendBreak();
    } catch (e) {
      throw e;
    }
  }

  /**
   * Standard serial port initialisation
   * @param port Serial port name to connect to
   * @param baud Baud rate in bps to use for communications
   * @param timeout Timeout value for serial reading
   */
  private async initialiseSerial(): Promise<void> {
    try {     
      await this.port.open({ baudRate: this.baud, parity: 'even', stopBits: 2 });
    } catch (e) {
      throw e;
    }
  }

  /**
     * Read data with timeout
     */
  private async readWithTimeout(
    bytesToRead: number
  ): Promise<Uint8Array> {
    const tempReader = this.port.readable!.getReader({ mode: 'byob' }) as ReadableStreamBYOBReader;
    try {
      const result = new Uint8Array(bytesToRead);
      let bytesRead = 0;

      while (bytesRead < bytesToRead) {
        const buffer = new ArrayBuffer(bytesToRead - bytesRead);
        const view = new Uint8Array(buffer);

        const readResult = await Promise.race([
          tempReader.read(view),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Read timeout')), this.timeout)
          )
        ]);

        if (readResult.done) {
          // Stream has been closed
          break;
        }

        if (readResult.value && readResult.value.byteLength > 0) {
          result.set(readResult.value, bytesRead);
          bytesRead += readResult.value.byteLength;
        }
      }

      return result.subarray(0, bytesRead);
    } finally {
      tempReader.releaseLock();
    }
  }

  /**
   * Sends a char array to UPDI without inter-byte delay
   * Note that the byte will echo back
   * @param command command to send
   */
  async send(command: Uint8Array): Promise<void> {   
    if (!this.port.writable) {
      throw new Error('Serial port writable stream is not available');
    }
    
    let writer = this.port.writable.getWriter();
    try {
      await writer.write(command);
      
      // Read and discard echo
      try {
        await this.readWithTimeout(command.length);
      } catch (e) {
        throw new Error('No echo received for UPDI command: ' + e);
      }
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Receives a frame of a known number of chars from UPDI
   * @param size bytes to receive
   */
  async receive(size: number): Promise<Uint8Array> {
    const data = await this.readWithTimeout(size);
    return data;
  }

  /**
   * System information block is just a string coming back from a SIB command
   */
  async sib(): Promise<Uint8Array> {
    await this.send(new Uint8Array([constants.UPDI_PHY_SYNC, constants.UPDI_KEY | constants.UPDI_KEY_SIB | constants.UPDI_SIB_32BYTES]));
    return await this.receive(32);
  }

  /**
   * Sends a double break to reset the UPDI port
   * BREAK is actually just a slower zero frame
   * A double break is guaranteed to push the UPDI state
   * machine into a known state, albeit rather brutally
   */
  async sendBreak(): Promise<void> {
    this.port.setSignals({ break: true });
    await this.sleep(25);
    this.port.setSignals({ break: false });
    await this.sleep(1);

    // Flush input buffer
    try {
      await this.readWithTimeout(1);
    } catch (e) {
      // Ignore errors during flush
    }
  }

  /**
   * Sends a double break to reset the UPDI port
   * BREAK is actually just a slower zero frame
   * A double break is guaranteed to push the UPDI state
   * machine into a known state, albeit rather brutally
   */
  async sendDoubleBreak(): Promise<void> {
    for (let i = 0; i < 2; i++) {
      this.sendBreak();
    }
  }

  async destroy(): Promise<void> {
    if (this.port && this.port.readable) {
      try {
        await this.port.readable.cancel();
      } catch (e) {
        // Stream might already be canceled
      }
    }

    if (this.port && this.port.writable) {
      try {
        await this.port.writable.abort();
      } catch (e) {
        // Stream might already be aborted
      }
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
