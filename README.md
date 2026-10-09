# AndroidBridge

**A Beginner-Friendly Python Linux CLI Tool for Inspecting and Managing Android Devices via USB Debugging**

AndroidBridge is a command-line interface tool created for Linux users (optimized for Kali Linux, Debian, and Ubuntu) to safely inspect and manage their own Android smartphone over an authorized USB connection using Android Debug Bridge (ADB).

---

## 🛡️ Security, Ethics & Privacy Principles

AndroidBridge is strictly designed as an administrative companion for devices **owned by the user** and connected with explicit consent:

1. **Zero Security Bypass**: AndroidBridge **never** bypasses Android lock screens, PINs, biometrics, disk encryption, app sandbox permissions, or the ADB RSA authorization key exchange.
2. **Strict User Consent**: The phone’s screen must be physically unlocked by the owner, and the "Allow USB debugging?" dialog must be explicitly approved.
3. **Safe Shared Storage Scope**: File browsing and transfers are intentionally restricted to user-accessible shared storage directories (e.g., `/sdcard/Download`, `/sdcard/DCIM`, `/sdcard/Documents`). The tool enforces path traversal sanitation against `../` attacks and does not access private app sandboxes (`/data/data/`) or system root partitions.
4. **No Spyware / No Stealth**: Contains no background daemons, no persistence, no hidden access mechanisms, no telemetry collection, and no remote surveillance features.

---

## 📋 Features

- **Automated ADB & Device Detection**: Instantly checks if `adb` is installed on your Linux system and reports device state (`authorized`, `unauthorized`, `offline`, or `no permissions`).
- **Clear Diagnostic Guidance**: Provides step-by-step instructions when the phone prompt is waiting for user RSA approval or when ADB is missing.
- **Hardware & OS Identity Inspection**: Displays the phone's manufacturer, model name, commercial market name, Android release version, SDK API level, CPU architecture, and hardware serial number.
- **Battery Diagnostics**: Queries real-time battery charge percentage, charging power source (AC, USB, Wireless), battery health, temperature in °C and °F, and millivoltage.
- **Storage Metrics**: Reports total capacity, used space, free space, and percentage utilization for internal shared storage (`/sdcard`).
- **Safe Shared Storage File Browser**: Lists files in folders like Downloads, Photos/DCIM, Documents, and Pictures with human-readable file sizes and timestamps.
- **Authorized Bidirectional File Copying**:
  - **Linux to Phone (`adb push`)**: Safely copies files from the Linux computer into shared storage.
  - **Phone to Linux (`adb pull`)**: Safely pulls files from phone shared storage onto the Linux computer.
- **Troubleshooting Utility**: Built-in helper to restart ADB server and resolve Linux udev rules.

---

## 🐧 Installation Instructions for Kali Linux

### Method 1: Automated Setup Script (Recommended)

1. Open your terminal in the `AndroidBridge` directory.
2. Run the automated setup script:
   ```bash
   chmod +x setup_kali.sh
   ./setup_kali.sh
   ```
   *This script verifies Python 3, installs the official Debian/Kali `adb` package, sets up Android udev rules for regular user access, and starts the ADB daemon.*

---

### Method 2: Manual Step-by-Step Installation

1. **Update package repositories**:
   ```bash
   sudo apt update
   ```

2. **Install ADB and Python 3**:
   ```bash
   sudo apt install -y adb python3
   ```

3. **Verify ADB installation**:
   ```bash
   adb version
   ```

4. **(Optional but Recommended) Configure Linux udev rules**:
   To allow regular non-root users on Kali Linux to communicate with USB Android devices without `sudo`:
   ```bash
   sudo bash -c 'cat << "EOF" > /etc/udev/rules.d/51-android.rules
   SUBSYSTEM=="usb", ATTR{idVendor}!="", MODE="0666", GROUP="plugdev"
   EOF'
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

5. **Start ADB daemon**:
   ```bash
   adb start-server
   ```

---

## 📱 Preparing Your Android Phone

Before running the tool, configure your Android phone:

1. **Unlock Phone**: Ensure the phone screen is turned on and unlocked.
2. **Enable Developer Options**:
   - Open **Settings** on your Android device.
   - Go to **About Phone**.
   - Tap **Build Number** repeatedly **7 times** until you see the notification *"You are now a developer!"*.
3. **Turn on USB Debugging**:
   - Navigate to **Settings** → **System** (or **Additional Settings**) → **Developer Options**.
   - Scroll down to the **Debugging** section and toggle **USB Debugging** to **ON**.
4. **Connect USB Cable**:
   - Connect the phone to your Linux computer using a USB data cable (ensure the cable supports data, not charging only).
   - In the Android notification shade, set the USB mode to **File Transfer / Android Auto (MTP)**.
5. **Authorize the Computer**:
   - When prompted with **"Allow USB debugging?"** on the phone screen:
     - Check the checkbox **"Always allow from this computer"**.
     - Tap **"Allow"**.

---

## 🚀 Exact Commands to Run the Tool

From the project root folder:

```bash
python3 main.py
```

Or make it directly executable:

```bash
chmod +x main.py
./main.py
```

---

## 🖥️ Terminal Menu Overview

When launched, AndroidBridge presents an interactive menu:

```text
========================================================================
    ___              __           _     ______       _     __           
   /   |  ____  ____/ /________  (_)___/ / __ )_____(_)___/ /___ ____   
  / /| | / __ \/ __  / ___/ __ \/ / __  / __  / ___/ / __  / __ `/ _ \  
 / ___ |/ / / / /_/ / /  / /_/ / / /_/ / /_/ / /  / / /_/ / /_/ /  __/  
/_/  |_/_/ /_/\__,_/_/   \____/_/\__,_/_____/_/  /_/\__,_/\__, /\___/   
                                                         /____/         
   Android USB Debugging Bridge & Device Inspector for Linux / Kali   
========================================================================

[STATUS: CONNECTED & AUTHORIZED] Device: Pixel 8 (Serial: 28241FDH200389)

MAIN MENU:
  [1] Check Connection & ADB Authorization Status
  [2] Inspect Device Hardware & OS (Model, Android Version, Manufacturer, Serial)
  [3] Inspect Battery Metrics (Level, Status, Health, Temp, Voltage)
  [4] Inspect Storage Capacity (Total, Used, Free)
  [5] Browse Files in Shared Storage (/sdcard/Download, etc.)
  [6] Copy File: Linux Computer -> Android Phone (adb push)
  [7] Copy File: Android Phone -> Linux Computer (adb pull)
  [8] Troubleshooting & Kali Linux Setup Guide
  [9] Exit AndroidBridge
```

---

## 🔧 Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`ADB is not installed`** | Missing `adb` package on Linux | Run `sudo apt update && sudo apt install -y adb` |
| **`STATUS: UNAUTHORIZED`** | Phone is connected but RSA key wasn't approved | Unlock phone screen and tap **Allow** on the prompt. If no prompt appears, toggle USB Debugging off and on in Developer Options. |
| **`STATUS: NO DEVICE DETECTED`** | Bad cable, charge-only cable, or USB debugging disabled | Check cable with `lsusb` in Kali. Ensure USB Debugging is ON in Settings. |
| **`no permissions (udev)`** | Linux user lacks permissions for USB device node | Add `/etc/udev/rules.d/51-android.rules` and run `adb kill-server && adb start-server`. |
| **`offline`** | ADB connection desynced or cable loose | Unplug and replug the USB cable, or select Option 8 to restart the ADB daemon. |

---

## 📂 Project Structure

```text
androidbridge/
├── __init__.py           # Package metadata
├── adb_cli.py            # ADB execution wrapper, connection & state detection
├── device_info.py        # Hardware identity & battery status parsing
├── storage_manager.py    # Storage capacity & safe shared directory browser
├── transfer_manager.py   # Authorized push/pull file copy handlers
└── menu.py               # Interactive ANSI terminal UI & error workflows
main.py                   # Executable entry point (`python3 main.py`)
setup_kali.sh             # Kali Linux automated prerequisite installer
requirements.txt          # Python runtime requirements (Standard Library)
README.md                 # Complete documentation & usage guide
```

---

## 📄 License

Licensed under the Apache License, Version 2.0.
