#!/usr/bin/env bash
# ==============================================================================
# AndroidBridge - Automated Setup Script for Kali Linux & Debian
# Installs ADB, sets up udev permissions, and checks Python 3 runtime
# ==============================================================================

set -e

GREEN="\033[92m"
CYAN="\033[96m"
YELLOW="\033[93m"
RED="\033[91m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "         AndroidBridge - Setup for Kali Linux            "
echo "=========================================================="
echo -e "${RESET}"

# 1. Check Python 3
echo -e "${CYAN}[1/5] Checking Python 3 installation...${RESET}"
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version)
    echo -e "${GREEN}✓ Found: ${PY_VER}${RESET}"
else
    echo -e "${RED}✗ Python 3 not found. Installing python3...${RESET}"
    sudo apt-get update && sudo apt-get install -y python3
fi

# 2. Update package lists and install ADB
echo -e "\n${CYAN}[2/5] Installing Android Debug Bridge (adb)...${RESET}"
if command -v adb >/dev/null 2>&1; then
    ADB_VER=$(adb version | head -n 1)
    echo -e "${GREEN}✓ ADB is already installed: ${ADB_VER}${RESET}"
else
    echo -e "${YELLOW}Installing 'adb' via apt-get...${RESET}"
    sudo apt-get update
    sudo apt-get install -y adb
    echo -e "${GREEN}✓ ADB installed successfully.${RESET}"
fi

# 3. Configure Android udev rules for Kali Linux
echo -e "\n${CYAN}[3/5] Configuring Android udev rules (plugdev permissions)...${RESET}"
RULES_FILE="/etc/udev/rules.d/51-android.rules"

if [ ! -f "$RULES_FILE" ]; then
    echo -e "${YELLOW}Creating ${RULES_FILE}...${RESET}"
    sudo bash -c 'cat << "EOF" > /etc/udev/rules.d/51-android.rules
# Android USB Debugging generic udev rule for standard non-root access
SUBSYSTEM=="usb", ATTR{idVendor}!="", MODE="0666", GROUP="plugdev"
EOF'
    sudo udevadm control --reload-rules 2>/dev/null || true
    sudo udevadm trigger 2>/dev/null || true
    echo -e "${GREEN}✓ udev rules installed and reloaded.${RESET}"
else
    echo -e "${GREEN}✓ udev rules already present in ${RULES_FILE}.${RESET}"
fi

# 4. Make main.py executable
echo -e "\n${CYAN}[4/5] Making AndroidBridge executable...${RESET}"
chmod +x main.py
echo -e "${GREEN}✓ main.py is now marked executable.${RESET}"

# 5. Start ADB server & test
echo -e "\n${CYAN}[5/5] Starting ADB Daemon and scanning for devices...${RESET}"
adb start-server

echo -e "\n${GREEN}${BOLD}==========================================================${RESET}"
echo -e "${GREEN}${BOLD}            Setup Complete! AndroidBridge is Ready.        ${RESET}"
echo -e "${GREEN}${BOLD}==========================================================${RESET}"
echo -e "To launch AndroidBridge right now, run:"
echo -e "    ${CYAN}${BOLD}python3 main.py${RESET}"
echo -e "\nDevice preparation reminder:"
echo -e "  1. Connect your Android phone via USB."
echo -e "  2. Go to Settings -> About Phone -> Tap 'Build Number' 7 times."
echo -e "  3. Go to Developer Options -> Turn on 'USB Debugging'."
echo -e "  4. Look at your phone screen: Tap 'Allow' on 'Allow USB debugging?'."
echo ""
