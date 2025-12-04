# Configuration
DEBUG ?= 0
MCU = attiny3226
PROGRAMMER = serialupdi
PORT = /dev/cu.usbserial-20120
F_CPU = 20000000
ifeq ($(DEBUG),1)
OBJDIR = build/debug
else
OBJDIR = build/release
endif
DEPDIR = $(OBJDIR)/.deps

# Compiler and tools
CC = avr-gcc
OBJCOPY = avr-objcopy
AVRSIZE = avr-size
AVRDUDE = avrdude
RM = rm -rf

# Source files
SRC = $(wildcard src/*.c) $(wildcard src/fsc_pd/*.c)
OBJS = $(patsubst src/%.c,$(OBJDIR)/%.o,$(wildcard src/*.c)) \
	$(patsubst src/fsc_pd/%.c,$(OBJDIR)/fsc_pd_%.o,$(wildcard src/fsc_pd/*.c))
DEPS = $(patsubst src/%.c,$(DEPDIR)/%.d,$(wildcard src/*.c)) \
	$(patsubst src/fsc_pd/%.c,$(DEPDIR)/fsc_pd_%.d,$(wildcard src/fsc_pd/*.c))

# Output files
TARGET = main
ELF = $(OBJDIR)/$(TARGET).elf
HEX = $(OBJDIR)/$(TARGET).hex
EEP = $(OBJDIR)/$(TARGET).eep

# Compiler flags
CFLAGS = -mmcu=$(MCU) -DF_CPU=$(F_CPU)UL
CFLAGS += -DRTC_TEMPERATURE_COMPENSATION
CFLAGS += -DFSC_HAVE_SRC -DFSC_HAVE_SNK -DFSC_HAVE_DRP -DFSC_HAVE_PPS_SOURCE
CFLAGS += -DFSC_GSCE_FIX
CFLAGS += -Isrc
ifeq ($(DEBUG),1)
CFLAGS += -DDEBUG
endif
CFLAGS += -Os -Wall -Wextra -std=gnu99
CFLAGS += -flto -fwhole-program
CFLAGS += -MMD -MP -MF $(DEPDIR)/$(*F).d
CFLAGS += -Wno-unused-parameter
CFLAGS_FSC_PD = -Wno-implicit-fallthrough -Wno-parentheses

LDFLAGS = -mmcu=$(MCU) -Wl,--gc-sections
ifeq ($(DEBUG),1)
# Include minimal printf; saves around 400 bytes. Only include when printf is actually
# being used (i.e. debug), otherwise the printf will be linked even if it is never called.
LDFLAGS += -Wl,-u,vfprintf -lprintf_min
endif

# Targets
.PHONY: all clean flash eeprom fuses

all: $(HEX)

eeprom: $(EEP)
	$(AVRDUDE) -c $(PROGRAMMER) -p $(MCU) -P $(PORT) -U eeprom:w:$<:i

fuses:
	$(AVRDUDE) -c $(PROGRAMMER) -p $(MCU) -P $(PORT) -U fuses:w:fuses.hex:i

$(OBJDIR):
	@mkdir -p $(OBJDIR) $(DEPDIR)


$(OBJDIR)/%.o: src/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(OBJDIR)/fsc_pd_%.o: src/fsc_pd/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) $(CFLAGS_FSC_PD) -c $< -o $@

$(ELF): $(OBJS)
	$(CC) $(LDFLAGS) $^ -o $@
	$(AVRSIZE) $@

$(HEX): $(ELF)
	$(OBJCOPY) -O ihex -R .eeprom $< $@

$(EEP): $(ELF)
	$(OBJCOPY) -O ihex -j .eeprom $< $@

flash: $(HEX)
	@echo ""
	@if [ "$(DEBUG)" = "1" ]; then \
		echo "\033[1;35m╔════════════════════════════════════════╗\033[0m"; \
		echo "\033[1;35m║  FLASHING: DEBUG BUILD                 ║\033[0m"; \
		echo "\033[1;35m╚════════════════════════════════════════╝\033[0m"; \
	else \
		echo "\033[1;32m╔════════════════════════════════════════╗\033[0m"; \
		echo "\033[1;32m║  FLASHING: RELEASE BUILD              ║\033[0m"; \
		echo "\033[1;32m╚════════════════════════════════════════╝\033[0m"; \
	fi
	@echo ""
	$(AVRDUDE) -c $(PROGRAMMER) -p $(MCU) -P $(PORT) -U flash:w:$<:i

clean:
	$(RM) $(OBJDIR)

-include $(DEPS)