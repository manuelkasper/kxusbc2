/**
 * UPDI protocol constants
 */

// UPDI commands and control definitions
export const UPDI_LDS = 0x00;
export const UPDI_STS = 0x40;
export const UPDI_LD = 0x20;
export const UPDI_ST = 0x60;
export const UPDI_LDCS = 0x80;
export const UPDI_STCS = 0xc0;
export const UPDI_REPEAT = 0xa0;
export const UPDI_KEY = 0xe0;

export const UPDI_PTR = 0x00;
export const UPDI_PTR_INC = 0x04;
export const UPDI_PTR_ADDRESS = 0x08;

export const UPDI_ADDRESS_8 = 0x00;
export const UPDI_ADDRESS_16 = 0x04;
export const UPDI_ADDRESS_24 = 0x08;

export const UPDI_DATA_8 = 0x00;
export const UPDI_DATA_16 = 0x01;
export const UPDI_DATA_24 = 0x02;

export const UPDI_KEY_SIB = 0x04;
export const UPDI_KEY_KEY = 0x00;

export const UPDI_KEY_64 = 0x00;
export const UPDI_KEY_128 = 0x01;
export const UPDI_KEY_256 = 0x02;

export const UPDI_SIB_8BYTES = UPDI_KEY_64;
export const UPDI_SIB_16BYTES = UPDI_KEY_128;
export const UPDI_SIB_32BYTES = UPDI_KEY_256;

export const UPDI_REPEAT_BYTE = 0x00;
export const UPDI_REPEAT_WORD = 0x01;

export const UPDI_PHY_SYNC = 0x55;
export const UPDI_PHY_ACK = 0x40;

export const UPDI_MAX_REPEAT_SIZE = 0xff + 1; // Repeat counter of 1-byte, with off-by-one counting

// CS and ASI Register Address map
export const UPDI_CS_STATUSA = 0x00;
export const UPDI_CS_STATUSB = 0x01;
export const UPDI_CS_CTRLA = 0x02;
export const UPDI_CS_CTRLB = 0x03;
export const UPDI_ASI_KEY_STATUS = 0x07;
export const UPDI_ASI_RESET_REQ = 0x08;
export const UPDI_ASI_CTRLA = 0x09;
export const UPDI_ASI_SYS_CTRLA = 0x0a;
export const UPDI_ASI_SYS_STATUS = 0x0b;
export const UPDI_ASI_CRC_STATUS = 0x0c;

export const UPDI_CTRLA_IBDLY_BIT = 7;
export const UPDI_CTRLA_RSD_BIT = 3;

export const UPDI_CTRLB_CCDETDIS_BIT = 3;
export const UPDI_CTRLB_UPDIDIS_BIT = 2;

export const UPDI_KEY_NVM = "NVMProg ";
export const UPDI_KEY_CHIPERASE = "NVMErase";
export const UPDI_KEY_UROW = "NVMUs&te";

export const UPDI_ASI_STATUSA_REVID = 4;
export const UPDI_ASI_STATUSB_PESIG = 0;

export const UPDI_ASI_KEY_STATUS_CHIPERASE = 3;
export const UPDI_ASI_KEY_STATUS_NVMPROG = 4;
export const UPDI_ASI_KEY_STATUS_UROWWRITE = 5;

export const UPDI_ASI_SYS_STATUS_RSTSYS = 5;
export const UPDI_ASI_SYS_STATUS_INSLEEP = 4;
export const UPDI_ASI_SYS_STATUS_NVMPROG = 3;
export const UPDI_ASI_SYS_STATUS_UROWPROG = 2;
export const UPDI_ASI_SYS_STATUS_LOCKSTATUS = 0;

export const UPDI_ASI_SYS_CTRLA_UROW_FINAL = 1;

export const UPDI_RESET_REQ_VALUE = 0x59;
