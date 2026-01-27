/**
 * KXUSBC2 Programmer UI Controller
 * Manages the web interface for programming ATtiny3226-based USB-C charger firmware and EEPROM configuration
 */

import { UpdiApplication } from './serialupdi/application.js';
import { parseHexFile } from './intel-hex-parser.js';
import { ATTINY3226_DEVICE, type DeviceInfo } from './devices.js';

// Device and memory addresses
const DEVICE_ID_ADDRESS = 0x1100;       // Device ID register address
const NVMCTRL_ADDRESS = 0x1000;         // NVM Controller address
const EEPROM_CONFIG_ADDRESS = 0x1400;   // EEPROM base address
const EEPROM_CONFIG_SIZE = 20;          // Total size of config structure in bytes
const EEPROM_MAGIC = 0x4355;            // Magic value for configuration validation
const MAX_FILE_SIZE = 1024 * 1024;      // 1MB file size limit
const PROGRESS_COMPLETE_DELAY = 2000;   // milliseconds

// EEPROM configuration field IDs for form elements
const EEPROM_CONFIG_FIELD_IDS = [
    'config-role',
    'config-pdmode',
    'config-charging-current',
    'config-charging-voltage',
    'config-dc-current',
    'config-otg-current',
    'config-discharge-voltage',
    'config-otg-headroom',
    'config-charge-when-on',
    'config-enable-thermistor',
    'config-user-rtc-offset',
] as const;

/**
 * EEPROM Configuration structure matching sysconfig.h
 */
interface EepromConfig {
    magic: number;           // 0x4355
    role: number;            // 0: SRC, 1: SNK, 2: DRP, 3: TRY_SRC, 4: TRY_SNK
    pdMode: number;          // 0: Off, 1: PD 2.0, 2: PD 3.0
    chargingCurrentLimit: number;    // mA, 50-5000
    chargingVoltageLimit: number;    // mV, 10000-18800
    dcInputCurrentLimit: number;     // mA, 100-3300
    otgCurrentLimit: number;         // mA, 120-3320
    dischargingVoltageLimit: number; // mV
    otgVoltageHeadroom: number;      // mV, 0-500
    chargeWhenRigIsOn: boolean;
    enableThermistor: boolean;
    userRtcOffset: number;           // ppm, -278 to +273
}

// Default EEPROM configuration values
const DEFAULT_EEPROM_CONFIG: EepromConfig = {
    magic: EEPROM_MAGIC,
    role: 2,           // DRP
    pdMode: 2,         // PD 3.0
    chargingCurrentLimit: 3000,
    chargingVoltageLimit: 12600,
    dcInputCurrentLimit: 3000,
    otgCurrentLimit: 3000,
    dischargingVoltageLimit: 9000,
    otgVoltageHeadroom: 100,
    chargeWhenRigIsOn: false,
    enableThermistor: false,
    userRtcOffset: 0,
};

// Validation constraints for EEPROM configuration parameters
const VALIDATION_CONSTRAINTS = {
    chargingCurrentLimit: { min: 50, max: 5000, unit: 'mA' },
    chargingVoltageLimit: { min: 10000, max: 18800, unit: 'mV' },
    dcInputCurrentLimit: { min: 100, max: 3300, unit: 'mA' },
    otgCurrentLimit: { min: 120, max: 3320, unit: 'mA' },
    userRtcOffset: { min: -278, max: 273, unit: 'ppm' },
} as const;

let app: UpdiApplication | null = null;
let port: SerialPort | null = null;
let currentProgramData: Uint8Array | null = null;
// Always use ATtiny3226 as the target device
const selectedDevice: DeviceInfo = ATTINY3226_DEVICE;

/**
 * Format a number as hexadecimal with padding
 */
function formatHex(value: number, padLength: number = 4): string {
    return `0x${value.toString(16).padStart(padLength, '0').toUpperCase()}`;
}

/**
 * Format a single byte as hexadecimal (0x00 format)
 */
function formatByte(value: number): string {
    return `0x${value.toString(16).padStart(2, '0').toUpperCase()}`;
}

/**
 * Read a little-endian 16-bit unsigned integer from bytes at offset
 */
function readU16(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

/**
 * Read a little-endian 16-bit signed integer from bytes at offset
 */
function readI16(bytes: Uint8Array, offset: number): number {
    const val = readU16(bytes, offset);
    // Convert to signed if negative
    return val > 32767 ? val - 65536 : val;
}

/**
 * Write a little-endian 16-bit unsigned integer to bytes at offset
 */
function writeU16(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = value & 0xFF;
    bytes[offset + 1] = (value >> 8) & 0xFF;
}

/**
 * Write a little-endian 16-bit signed integer to bytes at offset
 */
function writeI16(bytes: Uint8Array, offset: number, value: number): void {
    const unsigned = value < 0 ? value + 65536 : value;
    writeU16(bytes, offset, unsigned);
}

/**
 * Log a message to the operation log
 */
export function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
    const logDiv = getElement<HTMLDivElement>('log');
    if (!logDiv) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
    
    console.log(`[${type}] ${message}`);
}

/**
 * Update connection status display
 */
function updateStatus(state: 'disconnected' | 'connecting' | 'connected'): void {
    const status = getElement<HTMLDivElement>('status');
    if (!status) return;
    
    status.className = 'status ' + state;
    
    const messages: Record<string, string> = {
        'disconnected': 'Status: <strong>Disconnected</strong>',
        'connecting': 'Status: <strong>Connecting...</strong>',
        'connected': 'Status: <strong>Connected</strong>'
    };
    
    status.innerHTML = messages[state] || messages['disconnected'];
}

/**
 * Update program file button state based on file loaded status and connection state
 */
function updateProgramFileButtonState(): void {
    const programFileBtn = getElement<HTMLButtonElement>('btn-program-file');
    if (programFileBtn) {
        // Button is only enabled when connected AND file is loaded
        const hasFile = currentProgramData && currentProgramData.length > 0;
        programFileBtn.disabled = !app || !hasFile;
    }
}

/**
 * Safe element getter with type casting
 */
function getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

/**
 * Get all EEPROM configuration form elements.
 * Used by both renderEepromConfiguration() and readEepromConfigurationFromUI().
 */
function getEepromFormElements(): Record<string, HTMLInputElement | null> {
    return {
        role: document.getElementById('config-role') as HTMLInputElement | null,
        pdmode: document.getElementById('config-pdmode') as HTMLInputElement | null,
        chargingCurrent: document.getElementById('config-charging-current') as HTMLInputElement | null,
        chargingVoltage: document.getElementById('config-charging-voltage') as HTMLInputElement | null,
        dcCurrent: document.getElementById('config-dc-current') as HTMLInputElement | null,
        otgCurrent: document.getElementById('config-otg-current') as HTMLInputElement | null,
        dischargeVoltage: document.getElementById('config-discharge-voltage') as HTMLInputElement | null,
        otgHeadroom: document.getElementById('config-otg-headroom') as HTMLInputElement | null,
        chargeWhenOn: document.getElementById('config-charge-when-on') as HTMLInputElement | null,
        enableThermistor: document.getElementById('config-enable-thermistor') as HTMLInputElement | null,
        userRtcOffset: document.getElementById('config-user-rtc-offset') as HTMLInputElement | null,
    };
}

/**
 * Show the EEPROM configuration container
 */
function showEepromConfiguration(): void {
    const configContainer = getElement<HTMLDivElement>('config-container');
    if (configContainer) {
        configContainer.style.display = 'block';
    }
}

/**
 * Hide the EEPROM configuration container
 */
function hideEepromConfiguration(): void {
    const configContainer = getElement<HTMLDivElement>('config-container');
    if (configContainer) {
        configContainer.style.display = 'none';
    }
}

/**
 * Validate EEPROM configuration against constraints.
 * @returns Array of validation error messages (empty if valid)
 */
function validateEepromConfig(config: EepromConfig): string[] {
    const errors: string[] = [];

    if (config.chargingCurrentLimit < VALIDATION_CONSTRAINTS.chargingCurrentLimit.min || 
        config.chargingCurrentLimit > VALIDATION_CONSTRAINTS.chargingCurrentLimit.max) {
        const c = VALIDATION_CONSTRAINTS.chargingCurrentLimit;
        errors.push(`Charging current limit must be between ${c.min} and ${c.max} ${c.unit}`);
    }
    if (config.chargingVoltageLimit < VALIDATION_CONSTRAINTS.chargingVoltageLimit.min || 
        config.chargingVoltageLimit > VALIDATION_CONSTRAINTS.chargingVoltageLimit.max) {
        const c = VALIDATION_CONSTRAINTS.chargingVoltageLimit;
        errors.push(`Charging voltage limit must be between ${c.min} and ${c.max} ${c.unit}`);
    }
    if (config.dcInputCurrentLimit < VALIDATION_CONSTRAINTS.dcInputCurrentLimit.min || 
        config.dcInputCurrentLimit > VALIDATION_CONSTRAINTS.dcInputCurrentLimit.max) {
        const c = VALIDATION_CONSTRAINTS.dcInputCurrentLimit;
        errors.push(`DC input current limit must be between ${c.min} and ${c.max} ${c.unit}`);
    }
    if (config.otgCurrentLimit < VALIDATION_CONSTRAINTS.otgCurrentLimit.min || 
        config.otgCurrentLimit > VALIDATION_CONSTRAINTS.otgCurrentLimit.max) {
        const c = VALIDATION_CONSTRAINTS.otgCurrentLimit;
        errors.push(`OTG current limit must be between ${c.min} and ${c.max} ${c.unit}`);
    }
    if (config.userRtcOffset < VALIDATION_CONSTRAINTS.userRtcOffset.min || 
        config.userRtcOffset > VALIDATION_CONSTRAINTS.userRtcOffset.max) {
        const c = VALIDATION_CONSTRAINTS.userRtcOffset;
        errors.push(`User RTC offset must be between ${c.min} and ${c.max} ${c.unit}`);
    }

    return errors;
}

/**
 * Check if app is connected and throw error if not
 */
function checkConnected(): void {
    if (!app) {
        log('Not connected', 'error');
        throw new Error('Not connected');
    }
}

/**
 * Handle error and log it
 */
function handleError(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
        return error.message;
    }
    return defaultMessage;
}

/**
 * Enable/disable buttons based on connection state.
 * - Connect button only enabled when disconnected
 * - Disconnect button only enabled when connected
 * - EEPROM buttons only enabled when connected
 * - Program file button only enabled when connected AND file is loaded
 */
function disableConnectionButtons(connected: boolean): void {
    // Buttons that should only be available when connected
    const programmingButtons = ['btn-read-eeprom', 'btn-save-eeprom', 'btn-reset-eeprom'];
    
    for (const id of programmingButtons) {
        const btn = getElement<HTMLButtonElement>(id);
        if (btn) btn.disabled = !connected;
    }
    
    // Program file button: only enabled when connected AND file is loaded
    const programFileBtn = getElement<HTMLButtonElement>('btn-program-file');
    if (programFileBtn) {
        const hasFile = currentProgramData && currentProgramData.length > 0;
        programFileBtn.disabled = !connected || !hasFile;
    }
    
    // Connect button should be disabled when connected
    const connectBtn = getElement<HTMLButtonElement>('btn-connect');
    if (connectBtn) connectBtn.disabled = connected;
    
    // Disconnect button should be enabled when connected
    const disconnectBtn = getElement<HTMLButtonElement>('btn-disconnect');
    if (disconnectBtn) disconnectBtn.disabled = !connected;
}

/**
 * Connect to a serial port and initialize UPDI
 */
export async function connectSerial(): Promise<void> {
    try {
        updateStatus('connecting');
        
        if (!port) {
            log('Requesting port...');
            port = await navigator.serial.requestPort();
            log('Port selected');
        }

        const baudRateSelect = getElement<HTMLSelectElement>('baud-rate');
        
        const baudRate = parseInt(baudRateSelect?.value || '115200');
        const timeout = 1000;  // Fixed timeout value in milliseconds

        log(`Connecting to port at ${baudRate} baud...`, 'info');

        // Create the UPDI application
        app = new UpdiApplication(port, baudRate, { nvmctrlAddress: NVMCTRL_ADDRESS }, timeout);
        
        // Initialize the application
        await app.init();
        
        log('Connected successfully', 'success');
        updateStatus('connected');
        disableConnectionButtons(true);
        
        // Automatically read device info
        try {
            log('Reading device info...', 'info');
            let deviceInfo = await app.readDeviceInfo();
            log(`Device Info: ${JSON.stringify(deviceInfo)}`, 'success');
        } catch (error) {
            log(`Error reading device info: ${handleError(error, 'Unknown error')}`, 'error');
        }

        // Automatically enter programming mode
        try {
            log('Entering programming mode...', 'info');
            await app.enterProgmode();
            log('Entered programming mode', 'success');
        } catch (error) {
            log(`Error entering prog mode: ${handleError(error, 'Unknown error')}`, 'error');
        }

        // Verify device ID - this is required, don't continue if it fails
        try {
            await verifyDeviceID();
        } catch (error) {
            const errorMsg = handleError(error, 'Unknown error');
            log(`Device verification failed: ${errorMsg}`, 'error');
            log('Disconnecting due to device verification failure', 'warn');
            throw new Error(`Device verification failed: ${errorMsg}`);
        }

        // Automatically read EEPROM configuration after successful connection
        try {
            log('Reading EEPROM configuration...', 'info');
            const result = await readEepromConfiguration();
            renderEepromConfiguration(result.config);
            showEepromConfiguration();
            // Enable save button if EEPROM is blank so user can save defaults without explicit reset
            if (result.isBlank) {
                const saveBtn = getElement<HTMLButtonElement>('btn-save-eeprom');
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
            } else {
                disableSaveButton();
            }
        } catch (error) {
            log(`Error reading EEPROM configuration: ${handleError(error, 'Unknown error')}`, 'error');
        }
    } catch (error) {
        log(`Connection failed: ${handleError(error, 'Unknown error')}`, 'error');
        updateStatus('disconnected');
        
        // Close the port on connection failure
        try {
            if (port) {
                await port.close();
                port = null;
            }
        } catch (closeError) {
            log(`Error closing port: ${handleError(closeError, 'Unknown error')}`, 'error');
        }
        
        app = null;
        disableConnectionButtons(false);
    }
}

/**
 * Disconnect from the serial port
 */
export async function disconnectSerial(): Promise<void> {
    try {
        // Leave programming mode if active
        if (app) {
            try {
                log('Leaving programming mode...', 'info');
                await app.leaveProgmode();
                log('Left programming mode', 'success');
            } catch (error) {
                log(`Error leaving prog mode: ${handleError(error, 'Unknown error')}`, 'warn');
            }
        }

        if (port) {
            await port.close();
            port = null;
            app = null;
            log('Disconnected', 'info');
            updateStatus('disconnected');
            disableConnectionButtons(false);
            hideEepromConfiguration();
        }
    } catch (error) {
        log(`Disconnect failed: ${handleError(error, 'Unknown error')}`, 'error');
    }
}


/**
 * Clear the operation log
 */
export function clearLog(): void {
    const logDiv = getElement<HTMLDivElement>('log');
    if (logDiv) logDiv.innerHTML = '';
}

/**
 * Load a binary file and return as Uint8Array
 */
async function loadBinaryFile(file: File): Promise<Uint8Array> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
                resolve(new Uint8Array(e.target.result));
            } else {
                reject(new Error('Failed to read file as binary'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Handle file selection (Intel HEX or binary).
 * Detects file type by extension and parses accordingly.
 * Updates UI with file information and enables programming button.
 * @param event - Input change event from file selector
 */
export async function handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
        // Detect file type by extension
        const ext = file.name.toLowerCase().split('.').pop();
        let fileTypeLabel = 'File';
        
        if (ext === 'hex' || ext === 'eep') {
            // Parse as Intel HEX
            const content = await file.text();
            const result = await parseHexFile(content);
            currentProgramData = result.data;
            fileTypeLabel = 'Intel HEX File';
        } else {
            // Load as binary
            currentProgramData = await loadBinaryFile(file);
            fileTypeLabel = 'Binary File';
        }
        
        // Show preview
        const programInfo = document.getElementById('program-info');
        if (programInfo) {
            programInfo.innerHTML = `
                <strong>File Type:</strong> ${fileTypeLabel}<br>
                <strong>File:</strong> ${file.name}<br>
                <strong>Total Bytes:</strong> ${currentProgramData.length}
            `;
        }
        
        const preview = document.getElementById('program-preview');
        if (preview) preview.style.display = 'block';
        
        log(`Loaded ${fileTypeLabel}: ${file.name} (${currentProgramData.length} bytes)`, 'success');
        updateProgramFileButtonState();
    } catch (error) {
        log(`Error loading file: ${handleError(error, 'Unknown error')}`, 'error');
        currentProgramData = null;
        updateProgramFileButtonState();
    }
}

/**
 * Program device flash memory from loaded file.
 * Validates file size, splits into pages, writes with verification.
 * @throws Error if not connected, no file loaded, or file too large
 */
export async function programFile(): Promise<void> {
    try {
        // Validate prerequisites
        if (!app) {
            throw new Error('Not connected');
        }

        if (!currentProgramData || currentProgramData.length === 0) {
            throw new Error('No file loaded');
        }
        // Flash memory configuration for ATtiny3226
        const memorySize = selectedDevice.flash_size!;
        const pageSize = selectedDevice.flash_page_size!;
        const startAddress = selectedDevice.flash_address!;
        const flashSize = selectedDevice.flash_size!;

        // Validate data fits in flash
        if (currentProgramData.length > flashSize) {
            throw new Error(`Firmware size (${currentProgramData.length} bytes) exceeds flash size (${flashSize} bytes)`);
        }

        log(`Programming firmware to flash...`, 'info');
        log(`Flash: ${formatHex(startAddress)}, page size=${pageSize} bytes`, 'info');

        // Get progress elements
        const progressDivEl = getElement<HTMLDivElement>('program-progress')!;
        const progressBarEl = getElement<HTMLDivElement>('program-progress-bar')!;
        const progressTextEl = getElement<HTMLElement>('program-progress-text')!;
        
        // Split data into pages
        const pages: { address: number; data: Uint8Array }[] = [];
        for (let offset = 0; offset < currentProgramData.length; offset += pageSize) {
            const pageEnd = Math.min(offset + pageSize, currentProgramData.length);
            let pageData = currentProgramData.slice(offset, pageEnd);
            
            // Pad the last page with 0xFF if it's smaller than page size
            if (pageData.length < pageSize) {
                const paddedData = new Uint8Array(pageSize);
                paddedData.set(pageData, 0);
                paddedData.fill(0xFF, pageData.length);
                pageData = paddedData;
            }
            
            const pageAddress = startAddress + offset;
            pages.push({ address: pageAddress, data: pageData });
        }

        // Erase all pages in the entire flash memory first
        // (UPDI parts don't have a single flash erase command, so each page must be erased individually)
        const totalFlashPages = memorySize / pageSize;
        log(`Erasing ${totalFlashPages} flash pages...`, 'info');
        
        progressDivEl.style.display = 'block';
        progressBarEl.classList.add('program-progress-bar-erase');
        
        for (let i = 0; i < totalFlashPages; i++) {
            const pageAddress = startAddress + (i * pageSize);
            await app.eraseFlashPage(pageAddress);
            
            // Update progress bar for erasing
            const eraseProgress = Math.round(((i + 1) / totalFlashPages) * 100);
            progressBarEl.style.width = `${eraseProgress}%`;
            progressTextEl.textContent = `Erasing: ${i + 1}/${totalFlashPages} pages (${eraseProgress}%)`;
        }
        
        log(`Erased ${totalFlashPages} flash pages`, 'success');
        progressBarEl.classList.remove('program-progress-bar-erase');

        // Write all pages to flash
        log(`Writing ${pages.length} pages...`, 'info');
        progressDivEl.style.display = 'block';
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            await app.writeFlash(page.address, page.data);

            log(`Wrote page ${i + 1} at ${formatHex(page.address)}: ${page.data.length} bytes`, 'info');
            
            // Update progress bar
            const writeProgress = Math.round(((i + 1) / pages.length) * 100);
            progressBarEl.style.width = `${writeProgress}%`;
            progressTextEl.textContent = `Writing: ${i + 1}/${pages.length} pages (${writeProgress}%)`;
        }

        // Verify all pages
        log('Verifying programmed data...', 'info');
        progressBarEl.classList.add('program-progress-bar-verify');
        progressTextEl.textContent = 'Verifying...';
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const readBack = await app.readData(page.address, page.data.length);
            for (let j = 0; j < page.data.length; j++) {
                if (readBack[j] !== page.data[j]) {
                    const addr = formatHex(page.address + j);
                    const wrote = formatByte(page.data[j]);
                    const read = formatByte(readBack[j]);
                    throw new Error(`Verification failed at address ${addr}: wrote ${wrote} but read ${read}`);
                }
            }
            log(`Verified page ${i + 1} at ${formatHex(page.address)}`, 'info');
            
            // Update verify progress
            const verifyProgress = Math.round(((i + 1) / pages.length) * 100);
            progressBarEl.style.width = `${verifyProgress}%`;
            progressTextEl.textContent = `Verifying: ${i + 1}/${pages.length} pages (${verifyProgress}%)`;
        }

        log(`Successfully programmed and verified firmware (${currentProgramData.length} bytes in ${pages.length} pages)`, 'success');
        
        // Show completion and hide after delay
        progressBarEl.classList.remove('program-progress-bar-verify');
        progressBarEl.classList.add('program-progress-bar-complete');
        progressBarEl.style.width = '100%';
        progressTextEl.textContent = 'Complete!';
        
        setTimeout(() => {
            progressDivEl.style.display = 'none';
            progressBarEl.classList.remove('program-progress-bar-complete');
        }, PROGRESS_COMPLETE_DELAY);
        
        // Clear loaded file
        currentProgramData = null;
        updateProgramFileButtonState();
    } catch (error) {
        log(`Error programming HEX file: ${handleError(error, 'Unknown error')}`, 'error');
    }
}

/**
 * Parse raw bytes from EEPROM into configuration structure.
 * Converts binary data (little-endian) to typed configuration object.
 * @param bytes - Raw EEPROM data, must be at least EEPROM_CONFIG_SIZE bytes
 * @returns Parsed configuration object
 * @throws Error if data is too small
 */
function parseEepromBytes(bytes: Uint8Array): EepromConfig {
    if (bytes.length < EEPROM_CONFIG_SIZE) {
        throw new Error(`Invalid EEPROM data: expected ${EEPROM_CONFIG_SIZE} bytes, got ${bytes.length}`);
    }

    return {
        magic: readU16(bytes, 0),
        role: bytes[2],
        pdMode: bytes[3],
        chargingCurrentLimit: readU16(bytes, 4),
        chargingVoltageLimit: readU16(bytes, 6),
        dcInputCurrentLimit: readU16(bytes, 8),
        otgCurrentLimit: readU16(bytes, 10),
        dischargingVoltageLimit: readU16(bytes, 12),
        otgVoltageHeadroom: readU16(bytes, 14),
        chargeWhenRigIsOn: bytes[16] !== 0,
        enableThermistor: bytes[17] !== 0,
        userRtcOffset: readI16(bytes, 18),
    };
}

/**
 * Convert configuration structure to raw bytes for EEPROM.
 * Converts typed configuration to binary data with little-endian encoding.
 * @param config - Configuration object to serialize
 * @returns Uint8Array of exactly EEPROM_CONFIG_SIZE bytes
 */
function configToEepromBytes(config: EepromConfig): Uint8Array {
    const bytes = new Uint8Array(EEPROM_CONFIG_SIZE);

    writeU16(bytes, 0, config.magic);
    bytes[2] = config.role;
    bytes[3] = config.pdMode;
    writeU16(bytes, 4, config.chargingCurrentLimit);
    writeU16(bytes, 6, config.chargingVoltageLimit);
    writeU16(bytes, 8, config.dcInputCurrentLimit);
    writeU16(bytes, 10, config.otgCurrentLimit);
    writeU16(bytes, 12, config.dischargingVoltageLimit);
    writeU16(bytes, 14, config.otgVoltageHeadroom);
    bytes[16] = config.chargeWhenRigIsOn ? 1 : 0;
    bytes[17] = config.enableThermistor ? 1 : 0;
    writeI16(bytes, 18, config.userRtcOffset);

    return bytes;
}

/**
 * Read EEPROM configuration from device memory.
 * Reads raw config bytes, validates magic value, handles erased EEPROM.
 * @returns Object with parsed configuration (or defaults if erased) and isBlank flag
 * @throws Error if device read fails
 */
async function readEepromConfiguration(): Promise<{ config: EepromConfig; isBlank: boolean }> {
    checkConnected();

    try {
        log('Reading EEPROM configuration from device...', 'info');
        const bytes = await app!.readData(EEPROM_CONFIG_ADDRESS, EEPROM_CONFIG_SIZE);
        
        if (bytes[0] === 0xFF && bytes[1] === 0xFF) {
            log('EEPROM appears to be erased, using default configuration', 'warn');
            return { config: { ...DEFAULT_EEPROM_CONFIG }, isBlank: true };
        }

        const config = parseEepromBytes(bytes);
        
        if (config.magic !== EEPROM_MAGIC) {
            log(`Warning: Invalid EEPROM magic value ${formatHex(config.magic)}. Using default configuration.`, 'warn');
            return { config: { ...DEFAULT_EEPROM_CONFIG }, isBlank: true };
        }

        log('Successfully read EEPROM configuration from device', 'success');
        return { config, isBlank: false };
    } catch (error) {
        throw new Error(`Failed to read EEPROM configuration: ${handleError(error, 'Unknown error')}`);
    }
}

/**
 * Write EEPROM configuration to device and verify.
 * Serializes config to bytes and writes via EEPROM write method.
 * Always reads back to verify data was written correctly.
 * @param config - Configuration object to write
 * @throws Error if write or verification fails
 */
async function writeEepromConfiguration(config: EepromConfig): Promise<void> {
    checkConnected();

    try {
        log('Writing EEPROM configuration to device...', 'info');
        
        // Ensure magic value is correct
        config.magic = EEPROM_MAGIC;
        
        const bytes = configToEepromBytes(config);
        await app!.writeEeprom(EEPROM_CONFIG_ADDRESS, bytes);
        
        log('EEPROM write complete, verifying...', 'info');
        
        // Read back and verify
        const readBack = await app!.readData(EEPROM_CONFIG_ADDRESS, EEPROM_CONFIG_SIZE);
        for (let i = 0; i < bytes.length; i++) {
            if (readBack[i] !== bytes[i]) {
                const address = formatHex(EEPROM_CONFIG_ADDRESS + i);
                const wrote = formatByte(bytes[i]);
                const read = formatByte(readBack[i]);
                throw new Error(`EEPROM verification failed at ${address}: wrote ${wrote} but read ${read}`);
            }
        }
        
        log('Successfully wrote and verified EEPROM configuration to device', 'success');
    } catch (error) {
        throw new Error(`Failed to write EEPROM configuration: ${handleError(error, 'Unknown error')}`);
    }
}

/**
 * Render EEPROM configuration values to UI form fields.
 * Populates all input fields and sets up change listeners.
 * @param config - Configuration object to display
 */
function renderEepromConfiguration(config: EepromConfig): void {
    const els = getEepromFormElements();

    if (els.role) els.role.value = String(config.role);
    if (els.pdmode) els.pdmode.value = String(config.pdMode);
    if (els.chargingCurrent) els.chargingCurrent.value = String(config.chargingCurrentLimit);
    if (els.chargingVoltage) els.chargingVoltage.value = String(config.chargingVoltageLimit);
    if (els.dcCurrent) els.dcCurrent.value = String(config.dcInputCurrentLimit);
    if (els.otgCurrent) els.otgCurrent.value = String(config.otgCurrentLimit);
    if (els.dischargeVoltage) els.dischargeVoltage.value = String(config.dischargingVoltageLimit);
    if (els.otgHeadroom) els.otgHeadroom.value = String(config.otgVoltageHeadroom);
    if (els.chargeWhenOn) els.chargeWhenOn.checked = config.chargeWhenRigIsOn;
    if (els.enableThermistor) els.enableThermistor.checked = config.enableThermistor;
    if (els.userRtcOffset) els.userRtcOffset.value = String(config.userRtcOffset);

    // Set up change listeners to detect unsaved changes
    setupEepromConfigChangeListeners();
}

/**
 * Read EEPROM configuration values from UI form fields.
 * Collects all form values with defaults.
 * @returns Configuration object from current UI state
 */
function readEepromConfigurationFromUI(): EepromConfig {
    const els = getEepromFormElements();

    return {
        magic: EEPROM_MAGIC,
        role: parseInt(els.role?.value || '2'),
        pdMode: parseInt(els.pdmode?.value || '2'),
        chargingCurrentLimit: parseInt(els.chargingCurrent?.value || '3000'),
        chargingVoltageLimit: parseInt(els.chargingVoltage?.value || '12600'),
        dcInputCurrentLimit: parseInt(els.dcCurrent?.value || '3000'),
        otgCurrentLimit: parseInt(els.otgCurrent?.value || '3000'),
        dischargingVoltageLimit: parseInt(els.dischargeVoltage?.value || '9000'),
        otgVoltageHeadroom: parseInt(els.otgHeadroom?.value || '100'),
        chargeWhenRigIsOn: els.chargeWhenOn?.checked || false,
        enableThermistor: els.enableThermistor?.checked || false,
        userRtcOffset: parseInt(els.userRtcOffset?.value || '0'),
    };
}

/**
 * Set up change listeners to detect configuration changes.
 * Enables save button when any config field changes.
 * Only called once to avoid duplicate listeners.
 */
function setupEepromConfigChangeListeners(): void {
    const handleChange = (): void => {
        const saveBtn = getElement<HTMLButtonElement>('btn-save-eeprom');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    };

    for (const id of EEPROM_CONFIG_FIELD_IDS) {
        const el = document.getElementById(id);
        if (el && !el.dataset.listenerAttached) {
            el.addEventListener('change', handleChange);
            el.addEventListener('input', handleChange);
            el.dataset.listenerAttached = 'true';
        }
    }
}

/**
 * Disable the save button.
 * Used after saving or when fresh data is loaded.
 */
function disableSaveButton(): void {
    const saveBtn = getElement<HTMLButtonElement>('btn-save-eeprom');
    if (saveBtn) {
        saveBtn.disabled = true;
    }
}

/**
 * Handle read EEPROM configuration button click.
 * Reads config from device, renders to UI, shows form.
 * @throws Error if read fails
 */
async function handleReadEepromConfiguration(): Promise<void> {
    try {
        const result = await readEepromConfiguration();
        renderEepromConfiguration(result.config);
        showEepromConfiguration();
        // Enable save button if EEPROM is blank so user can save defaults
        if (result.isBlank) {
            const saveBtn = getElement<HTMLButtonElement>('btn-save-eeprom');
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        } else {
            disableSaveButton();
        }
    } catch (error) {
        log(`Error reading EEPROM configuration: ${handleError(error, 'Unknown error')}`, 'error');
    }
}

/**
 * Handle save EEPROM configuration button click.
 * Validates all fields, writes to device, clears unsaved indicator.
 * @throws Error if validation or write fails
 */
async function handleSaveEepromConfiguration(): Promise<void> {
    try {
        const config = readEepromConfigurationFromUI();
        
        const validationErrors = validateEepromConfig(config);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors[0]);
        }

        await writeEepromConfiguration(config);
        disableSaveButton();
    } catch (error) {
        log(`Error saving EEPROM configuration: ${handleError(error, 'Unknown error')}`, 'error');
    }
}

/**
 * Handle reset EEPROM configuration to defaults button click.
 * Resets UI to default values and enables save button.
 */
function handleResetEepromConfiguration(): void {
    try {
        const config = { ...DEFAULT_EEPROM_CONFIG };
        renderEepromConfiguration(config);
        log('EEPROM configuration reset to defaults', 'info');
        
        const saveBtn = getElement<HTMLButtonElement>('btn-save-eeprom');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    } catch (error) {
        log(`Error resetting EEPROM configuration: ${handleError(error, 'Unknown error')}`, 'error');
    }
}

/**
 * Check if the browser supports the Web Serial API
 */
function checkWebSerialSupport(): void {
    if (!navigator.serial) {
        log('Web Serial API is not supported in this browser. Please use a Chromium-based browser (Chrome, Edge, Opera, etc.)', 'warn');
        
        // Disable connect button if Web Serial is not supported
        const connectBtn = getElement<HTMLButtonElement>('btn-connect');
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.title = 'Web Serial API not supported';
        }
    }
}


/**
 * Initialize the UI and set up event listeners
 */
export function initializeUI(): void {   
    // Initial button state - disable disconnect and program file at start
    disableConnectionButtons(false);
    updateProgramFileButtonState();
    
    // Check Web Serial API support (after button setup so it can override)
    checkWebSerialSupport();
    
    // Set up event listeners
    const elements = {
        connectBtn: getElement<HTMLButtonElement>('btn-connect'),
        disconnectBtn: getElement<HTMLButtonElement>('btn-disconnect'),
        readEepromBtn: getElement<HTMLButtonElement>('btn-read-eeprom'),
        clearLogBtn: getElement<HTMLButtonElement>('btn-clear-log'),
        programFileInput: getElement<HTMLInputElement>('program-file'),
        programFileBtn: getElement<HTMLButtonElement>('btn-program-file'),
        saveEepromBtn: getElement<HTMLButtonElement>('btn-save-eeprom'),
        resetEepromBtn: getElement<HTMLButtonElement>('btn-reset-eeprom')
    };
    
    if (elements.connectBtn) elements.connectBtn.addEventListener('click', connectSerial);
    if (elements.disconnectBtn) elements.disconnectBtn.addEventListener('click', disconnectSerial);
    if (elements.readEepromBtn) elements.readEepromBtn.addEventListener('click', handleReadEepromConfiguration);
    if (elements.clearLogBtn) elements.clearLogBtn.addEventListener('click', clearLog);
    if (elements.programFileInput) elements.programFileInput.addEventListener('change', handleFileSelect);
    if (elements.programFileBtn) elements.programFileBtn.addEventListener('click', programFile);
    if (elements.saveEepromBtn) elements.saveEepromBtn.addEventListener('click', handleSaveEepromConfiguration);
    if (elements.resetEepromBtn) elements.resetEepromBtn.addEventListener('click', handleResetEepromConfiguration);
        
    // Log initialization message
    log('KXUSBC2 Programmer initialized and ready', 'info');
}

/**
 * Verify that the connected device has the correct device ID
 */
async function verifyDeviceID(): Promise<void> {
    if (!app) {
        log('App not initialized', 'error');
        return;
    }

    try {
        const expectedID = selectedDevice.device_id;

        log(`Reading device ID from ${formatHex(DEVICE_ID_ADDRESS)}...`, 'info');
        const deviceIDBytes = await app.readData(DEVICE_ID_ADDRESS, 3);
        const deviceID = (deviceIDBytes[0] << 16) | (deviceIDBytes[1] << 8) | deviceIDBytes[2];
        log(`Read device ID: ${formatHex(deviceID, 6)}`, 'info');

        if (deviceID !== expectedID) {
            log(`ERROR: Device ID mismatch! Expected ${formatHex(expectedID || 0, 6)} but got ${formatHex(deviceID, 6)}. Is an ATtiny3226 connected?`, 'error');
            throw new Error('Device ID verification failed');
        }

        log(`Device ID verified: ATtiny3226 (${formatHex(deviceID, 6)})`, 'success');
    } catch (error) {
        throw new Error(`Failed to verify device ID: ${handleError(error, 'Unknown error')}`);
    }
}
