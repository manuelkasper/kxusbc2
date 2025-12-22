/**
 * Simple timer helper for UPDI stack
 */

/**
 * Simple timeout helper in milliseconds.
 */
export class Timeout {
  private timeoutMs: number;
  private startTime: number;

  /**
   * Start the expired counter instantly
   * @param timeoutMs milliseconds to count
   */
  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
    this.startTime = Date.now();
  }

  /**
   * Check if the timeout has expired
   * @returns True if expired, False otherwise
   */
  expired(): boolean {
    return Date.now() - this.startTime > this.timeoutMs;
  }
}
