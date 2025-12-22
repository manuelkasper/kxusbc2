/**
 * Intel HEX File Parser
 * Parses Intel HEX format files and merges segments into a single data array
 */

export interface HexParseResult {
    data: Uint8Array;
    address: number;
}

/**
 * Parse Intel HEX file and merge segments into a single Uint8Array
 */
export async function parseHexFile(content: string): Promise<HexParseResult> {
    const lines = content.split('\n').filter(line => line.trim().startsWith(':'));
    const segments = new Map<number, number[]>();
    
    for (const line of lines) {
        const byteCount = parseInt(line.substring(1, 3), 16);
        const address = parseInt(line.substring(3, 7), 16);
        const recordType = parseInt(line.substring(7, 9), 16);
        
        if (recordType === 0) {
            // Data record
            const hexData = line.substring(9, 9 + byteCount * 2);
            if (!segments.has(address)) {
                segments.set(address, []);
            }
            for (let i = 0; i < byteCount; i++) {
                const byte = parseInt(hexData.substring(i * 2, i * 2 + 2), 16);
                segments.get(address)!.push(byte);
            }
        } else if (recordType === 1) {
            // End of file
            break;
        }
    }
    
    // Find the address range
    let minAddr = Infinity;
    let maxAddr = 0;
    
    for (const addr of segments.keys()) {
        minAddr = Math.min(minAddr, addr);
        const endAddr = addr + segments.get(addr)!.length - 1;
        maxAddr = Math.max(maxAddr, endAddr);
    }
    
    // Merge all segments into a single Uint8Array
    const mergedSize = maxAddr - minAddr + 1;
    const mergedData = new Uint8Array(mergedSize);
    
    for (const [addr, bytes] of segments) {
        const offset = addr - minAddr;
        for (let i = 0; i < bytes.length; i++) {
            mergedData[offset + i] = bytes[i];
        }
    }
    
    return { data: mergedData, address: minAddr };
}
