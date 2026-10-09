"""
menu.py - Beginner-friendly terminal interface for AndroidBridge.
Provides interactive navigation, diagnostic advice, and color-coded statuses.
"""

import os
import sys
import time
from typing import Optional
from .adb_cli import ADBManager, ConnectedDevice
from .device_info import DeviceInspector
from .storage_manager import StorageManager, SHARED_STORAGE_PRESETS
from .transfer_manager import TransferManager

# ANSI Color Codes for clean terminal rendering
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def print_banner():
    banner = f"""
{Colors.CYAN}{Colors.BOLD}========================================================================
    ___              __           _     ______       _     __           
   /   |  ____  ____/ /________  (_)___/ / __ )_____(_)___/ /___ ____   
  / /| | / __ \\/ __  / ___/ __ \\/ / __  / __  / ___/ / __  / __ `/ _ \\  
 / ___ |/ / / / /_/ / /  / /_/ / / /_/ / /_/ / /  / / /_/ / /_/ /  __/  
/_/  |_/_/ /_/\\__,_/_/   \\____/_/\\__,_/_____/_/  /_/\\__,_/\\__, /\\___/   
                                                         /____/         
{Colors.RESET}{Colors.DIM}   Android USB Debugging Bridge & Device Inspector for Linux / Kali   {Colors.RESET}
{Colors.CYAN}========================================================================{Colors.RESET}
"""
    print(banner)


def clear_screen():
    # Only clear if terminal is standard tty
    if sys.stdout.isatty():
        os.system("cls" if os.name == "nt" else "clear")


class AndroidBridgeApp:
    def __init__(self):
        self.adb = ADBManager()
        self.inspector = DeviceInspector(self.adb)
        self.storage = StorageManager(self.adb)
        self.transfer = TransferManager(self.adb, self.storage)

    def print_status_bar(self) -> Optional[ConnectedDevice]:
        """Prints current connection status and active device badge."""
        if not self.adb.is_adb_installed():
            print(f"[{Colors.RED}STATUS: ADB NOT INSTALLED{Colors.RESET}] - Run: sudo apt install -y adb\n")
            return None

        devices = self.adb.list_devices()
        if not devices:
            print(f"[{Colors.YELLOW}STATUS: NO DEVICE DETECTED{Colors.RESET}] - Connect phone via USB with USB Debugging enabled.\n")
            return None

        active_dev = next((d for d in devices if d.serial == self.adb.serial), devices[0])
        if active_dev.is_ready:
            print(f"[{Colors.GREEN}STATUS: CONNECTED & AUTHORIZED{Colors.RESET}] Device: {active_dev.model} (Serial: {active_dev.serial})\n")
            return active_dev
        elif active_dev.is_unauthorized:
            print(f"[{Colors.RED}{Colors.BOLD}STATUS: UNAUTHORIZED{Colors.RESET}] Prompt pending on phone screen! Tap 'Allow USB debugging'.\n")
            return active_dev
        else:
            print(f"[{Colors.YELLOW}STATUS: {active_dev.state.upper()}{Colors.RESET}] Device: {active_dev.serial}\n")
            return active_dev

    def check_connection(self):
        """Option 1: Detailed connection detection and authorization test."""
        print(f"\n{Colors.BOLD}--- [1] Checking Connection & Authorization Status ---{Colors.RESET}\n")

        # 1. Check ADB Installation
        if not self.adb.is_adb_installed():
            print(f"{Colors.RED}[!] ADB binary not found on this Linux system.{Colors.RESET}")
            print(f"\n{Colors.BOLD}How to fix on Kali Linux / Debian / Ubuntu:{Colors.RESET}")
            print("  1. Open a terminal and run:")
            print(f"     {Colors.CYAN}sudo apt update && sudo apt install -y adb{Colors.RESET}")
            print("  2. Start ADB server:")
            print(f"     {Colors.CYAN}adb start-server{Colors.RESET}")
            print("  3. Run AndroidBridge again.")
            return

        version = self.adb.get_adb_version()
        print(f"{Colors.GREEN}[✓]{Colors.RESET} ADB is installed: {Colors.DIM}{version}{Colors.RESET}")

        # 2. Check Devices
        devices = self.adb.list_devices()
        if not devices:
            print(f"\n{Colors.YELLOW}[!] No connected Android devices detected.{Colors.RESET}")
            print("\nTroubleshooting checklist:")
            print("  1. Connect your Android phone to this Linux computer using a working USB data cable.")
            print("  2. On your phone: Open Settings -> About Phone -> Tap 'Build Number' 7 times to enable Developer Options.")
            print("  3. In Settings -> Developer Options: Toggle ON 'USB Debugging'.")
            print("  4. Set USB configuration to 'File Transfer (MTP)' or 'PTP' in your phone's notification panel.")
            print("  5. On Linux, if using Kali Linux, verify USB access with: 'lsusb'")
            return

        print(f"\nFound {len(devices)} device(s):")
        for idx, dev in enumerate(devices, 1):
            if dev.is_ready:
                badge = f"{Colors.GREEN}[AUTHORIZED / READY]{Colors.RESET}"
            elif dev.is_unauthorized:
                badge = f"{Colors.RED}[UNAUTHORIZED - PERMISSION REQUIRED]{Colors.RESET}"
            else:
                badge = f"{Colors.YELLOW}[{dev.state.upper()}]{Colors.RESET}"

            print(f"  {idx}. Serial: {Colors.BOLD}{dev.serial}{Colors.RESET} | Model: {dev.model} | State: {badge}")

        # If any unauthorized
        unauthorized = [d for d in devices if d.is_unauthorized]
        if unauthorized:
            print(f"\n{Colors.RED}{Colors.BOLD}ACTION REQUIRED ON PHONE SCREEN:{Colors.RESET}")
            print("Your phone is connected, but USB debugging is not yet authorized.")
            print("  1. Unlock your phone.")
            print("  2. A popup should appear: 'Allow USB debugging? The computer's RSA key fingerprint is...'")
            print("  3. Check the box: 'Always allow from this computer'")
            print("  4. Tap 'Allow'.")
            print("  5. After tapping Allow, run Option 1 again to refresh.")

    def inspect_device(self):
        """Option 2: Hardware and OS details."""
        print(f"\n{Colors.BOLD}--- [2] Inspecting Device Hardware & OS ---{Colors.RESET}\n")
        if not self._ensure_device_ready():
            return

        print("Querying Android system properties via getprop...")
        details = self.inspector.get_device_details()
        if not details:
            print(f"{Colors.RED}[!] Failed to read system properties. Ensure phone screen is unlocked.{Colors.RESET}")
            return

        print(f"\n{Colors.CYAN}{Colors.BOLD}DEVICE HARDWARE & IDENTITY{Colors.RESET}")
        print("-" * 55)
        print(f"  Manufacturer      : {Colors.BOLD}{details.manufacturer}{Colors.RESET}")
        print(f"  Model             : {Colors.BOLD}{details.model}{Colors.RESET} ({details.market_name})")
        print(f"  Android Version   : {Colors.GREEN}{details.android_version}{Colors.RESET} (API Level / SDK: {details.sdk_level})")
        print(f"  Serial Number     : {Colors.CYAN}{details.serial_number}{Colors.RESET}")
        print(f"  CPU Architecture  : {details.cpu_abi}")
        print(f"  Build Fingerprint : {details.build_id}")
        print("-" * 55)

    def inspect_battery(self):
        """Option 3: Battery metrics."""
        print(f"\n{Colors.BOLD}--- [3] Inspecting Battery Level & Health ---{Colors.RESET}\n")
        if not self._ensure_device_ready():
            return

        print("Querying battery metrics via dumpsys battery...")
        battery = self.inspector.get_battery_status()
        if not battery:
            print(f"{Colors.RED}[!] Could not retrieve battery metrics.{Colors.RESET}")
            return

        # Visual level bar
        bar_len = 20
        filled = int((battery.level / 100.0) * bar_len)
        bar = ("█" * filled) + ("░" * (bar_len - filled))

        level_color = Colors.GREEN if battery.level >= 40 else (Colors.YELLOW if battery.level >= 15 else Colors.RED)

        print(f"\n{Colors.CYAN}{Colors.BOLD}BATTERY DIAGNOSTICS{Colors.RESET}")
        print("-" * 55)
        print(f"  Battery Level     : {level_color}{Colors.BOLD}{battery.level}%{Colors.RESET} [{level_color}{bar}{Colors.RESET}]")
        print(f"  Charging Status   : {battery.status}")
        print(f"  Power Source      : {battery.power_source}")
        print(f"  Battery Health    : {Colors.GREEN if 'Good' in battery.health else Colors.YELLOW}{battery.health}{Colors.RESET}")
        print(f"  Temperature       : {battery.temperature_c:.1f}°C / {battery.temperature_f:.1f}°F")
        print(f"  Voltage           : {battery.voltage_mv / 1000.0:.3f} V ({battery.voltage_mv} mV)")
        print("-" * 55)

    def inspect_storage(self):
        """Option 4: Internal shared storage capacity."""
        print(f"\n{Colors.BOLD}--- [4] Inspecting Storage Capacity ---{Colors.RESET}\n")
        if not self._ensure_device_ready():
            return

        print("Querying shared filesystem storage via df...")
        storage = self.storage.get_storage_info()
        if not storage:
            print(f"{Colors.RED}[!] Could not retrieve storage statistics.{Colors.RESET}")
            return

        bar_len = 20
        filled = int((storage.percent_used / 100.0) * bar_len)
        bar = ("█" * filled) + ("░" * (bar_len - filled))
        use_color = Colors.GREEN if storage.percent_used < 70 else (Colors.YELLOW if storage.percent_used < 90 else Colors.RED)

        print(f"\n{Colors.CYAN}{Colors.BOLD}STORAGE CAPACITY (Shared Internal Storage){Colors.RESET}")
        print("-" * 55)
        print(f"  Mount Point       : {storage.mount_point}")
        print(f"  Filesystem        : {storage.filesystem}")
        print(f"  Total Capacity    : {storage.total_human}")
        print(f"  Used Space        : {storage.used_human}")
        print(f"  Available Space   : {storage.free_human}")
        print(f"  Usage Percentage  : {use_color}{storage.percent_used}%{Colors.RESET} [{use_color}{bar}{Colors.RESET}]")
        print("-" * 55)

    def browse_files(self):
        """Option 5: Browse user-selected shared storage directory."""
        print(f"\n{Colors.BOLD}--- [5] Browse Files in Shared Storage ---{Colors.RESET}\n")
        if not self._ensure_device_ready():
            return

        print("Select a folder to browse:")
        for idx, (path, desc) in enumerate(SHARED_STORAGE_PRESETS, 1):
            print(f"  [{idx}] {Colors.BOLD}{path}{Colors.RESET} - {desc}")
        print(f"  [{len(SHARED_STORAGE_PRESETS) + 1}] Custom shared path (e.g., /sdcard/Download/MyApp)")
        print(f"  [0] Back to main menu")

        choice = input(f"\nEnter choice [0-{len(SHARED_STORAGE_PRESETS) + 1}]: ").strip()
        if choice == "0":
            return

        target_dir = "/sdcard/Download"
        try:
            val = int(choice)
            if 1 <= val <= len(SHARED_STORAGE_PRESETS):
                target_dir = SHARED_STORAGE_PRESETS[val - 1][0]
            elif val == len(SHARED_STORAGE_PRESETS) + 1:
                custom = input("Enter path inside shared storage (/sdcard/...): ").strip()
                if not custom:
                    print("Cancelled.")
                    return
                target_dir = custom
            else:
                print(f"{Colors.RED}Invalid selection.{Colors.RESET}")
                return
        except ValueError:
            print(f"{Colors.RED}Invalid input.{Colors.RESET}")
            return

        print(f"\nListing contents of {Colors.BOLD}{target_dir}{Colors.RESET}...")
        success, entries, err = self.storage.list_directory(target_dir)

        if not success:
            print(f"{Colors.RED}[!] {err}{Colors.RESET}")
            return

        if not entries:
            print(f"{Colors.YELLOW}Directory is empty or no files found.{Colors.RESET}")
            return

        print(f"\nFound {len(entries)} item(s) in {target_dir}:")
        print(f"{'TYPE':<6} {'SIZE':<12} {'DATE':<18} {'NAME'}")
        print("-" * 65)
        for e in entries:
            type_tag = f"{Colors.BLUE}DIR{Colors.RESET}" if e.is_dir else f"{Colors.DIM}FILE{Colors.RESET}"
            name_str = f"{Colors.BOLD}{e.name}/{Colors.RESET}" if e.is_dir else e.name
            print(f"{type_tag:<15} {e.size_human:<12} {e.date:<18} {name_str}")
        print("-" * 65)

    def copy_linux_to_phone(self):
        """Option 6: Copy file from Linux computer to phone (adb push)."""
        print(f"\n{Colors.BOLD}--- [6] Copy File: Linux Computer -> Android Phone (adb push) ---{Colors.RESET}\n")
        if not self._ensure_device_ready():
            return

        print(f"{Colors.DIM}Copies a local file on your Linux machine into your Android shared storage.{Colors.RESET}")
        local_path = input("Enter local file path on Linux (e.g., ./document.pdf or ~/photo.jpg): ").strip()
        if not local_path:
            print("Cancelled.")
            return

        print("\nDestination folder on Android phone:")
        print("  [1] /sdcard/Download/ (Default)")
        print("  [2] /sdcard/Documents/")
        print("  [3] /sdcard/Pictures/")
        print("  [4] /sdcard/Music/")
        print("  [5] Custom path")

        dest_choice = input("Select destination [1-5, default 1]: ").strip()
        dest_map = {
            "1": "/sdcard/Download/",
            "2": "/sdcard/Documents/",
            "3": "/sdcard/Pictures/",
            "4": "/sdcard/Music/",
        }
        dest_path = dest_map.get(dest_choice, "/sdcard/Download/")
        if dest_choice == "5":
            custom_dest = input("Enter custom Android destination directory (/sdcard/...): ").strip()
            if custom_dest:
                dest_path = custom_dest

        print(f"\nCopying: {local_path} -> {dest_path} ...")
        result = self.transfer.push_to_device(local_path, dest_path)

        if result.success:
            print(f"{Colors.GREEN}[✓] SUCCESS!{Colors.RESET}")
            print(f"  {result.message}")
            print(f"  Bytes transferred: {result.bytes_transferred:,} bytes in {result.duration_seconds:.2f}s")
        else:
            print(f"{Colors.RED}[!] ERROR:{Colors.RESET} {result.message}")

    def copy_phone_to_linux(self):
        """Option 7: Copy file from phone to Linux computer (adb pull)."""
        print(f"\n{Colors.BOLD}--- [7] Copy File: Android Phone -> Linux Computer (adb pull) ---{Colors.RESET}\n")
        if not self._ensure_device_ready():
            return

        print(f"{Colors.DIM}Copies a file from Android shared storage to your Linux computer.{Colors.RESET}")
        phone_file = input("Enter full path on phone (e.g., /sdcard/Download/sample.txt): ").strip()
        if not phone_file:
            print("Cancelled.")
            return

        local_dest = input("Enter local destination folder on Linux [default: ~/Downloads]: ").strip()
        if not local_dest:
            local_dest = "~/Downloads"

        print(f"\nPulling: {phone_file} -> {local_dest} ...")
        result = self.transfer.pull_from_device(phone_file, local_dest)

        if result.success:
            print(f"{Colors.GREEN}[✓] SUCCESS!{Colors.RESET}")
            print(f"  {result.message}")
            print(f"  Bytes transferred: {result.bytes_transferred:,} bytes in {result.duration_seconds:.2f}s")
        else:
            print(f"{Colors.RED}[!] ERROR:{Colors.RESET} {result.message}")

    def show_troubleshooting(self):
        """Option 8: Complete troubleshooting and diagnostics guide."""
        print(f"\n{Colors.BOLD}--- [8] Troubleshooting & Kali Linux Setup Guide ---{Colors.RESET}\n")
        guide = f"""
{Colors.CYAN}{Colors.BOLD}1. INSTALLING ADB ON KALI LINUX{Colors.RESET}
   Kali Linux does not install ADB by default. Open a terminal and run:
     {Colors.BOLD}sudo apt update && sudo apt install -y adb python3{Colors.RESET}

{Colors.CYAN}{Colors.BOLD}2. ENABLING USB DEBUGGING ON ANDROID PHONE{Colors.RESET}
   a. Open {Colors.BOLD}Settings{Colors.RESET} on your phone.
   b. Scroll to {Colors.BOLD}About Phone{Colors.RESET}.
   c. Tap {Colors.BOLD}Build Number{Colors.RESET} 7 times until you see "You are now a developer!".
   d. Go back to {Colors.BOLD}Settings -> System (or Additional Settings) -> Developer Options{Colors.RESET}.
   e. Enable {Colors.BOLD}USB Debugging{Colors.RESET}.
   f. Plug in the USB cable to your Kali Linux PC.

{Colors.CYAN}{Colors.BOLD}3. RESOLVING "UNAUTHORIZED" ERROR{Colors.RESET}
   If AndroidBridge shows state 'unauthorized':
   - Unlock your phone screen.
   - Look for the popup dialog: "Allow USB debugging? The computer's RSA key fingerprint is..."
   - Check "Always allow from this computer" and tap "Allow".
   - If the popup did not appear:
     Try: Settings -> Developer Options -> "Revoke USB debugging authorizations", then unplug and re-plug.

{Colors.CYAN}{Colors.BOLD}4. RESOLVING "NO PERMISSIONS" / UDEV RULES ON LINUX{Colors.RESET}
   If 'adb devices' shows "no permissions":
   Add the standard Android udev rule:
     {Colors.BOLD}sudo bash -c 'echo "SUBSYSTEM==\\"usb\\", ATTR{{idVendor}}!=\\"\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"" > /etc/udev/rules.d/51-android.rules'{Colors.RESET}
     {Colors.BOLD}sudo udevadm control --reload-rules{Colors.RESET}
     {Colors.BOLD}sudo udevadm trigger{Colors.RESET}
     {Colors.BOLD}adb kill-server && adb start-server{Colors.RESET}

{Colors.CYAN}{Colors.BOLD}5. RESTARTING ADB SERVER{Colors.RESET}
   Would you like AndroidBridge to restart the ADB daemon now?
"""
        print(guide)
        ans = input("Restart ADB server now? [y/N]: ").strip().lower()
        if ans == "y":
            print("Restarting ADB server...")
            ok, msg = self.adb.restart_server()
            if ok:
                print(f"{Colors.GREEN}[✓] {msg}{Colors.RESET}")
            else:
                print(f"{Colors.RED}[!] {msg}{Colors.RESET}")

    def _ensure_device_ready(self) -> bool:
        """Helper to verify ADB is installed and a device is authorized before commands."""
        if not self.adb.is_adb_installed():
            print(f"{Colors.RED}[!] ADB is not installed. Run: sudo apt install -y adb{Colors.RESET}")
            return False

        devices = self.adb.list_devices()
        if not devices:
            print(f"{Colors.YELLOW}[!] No Android phone detected via USB. Connect phone with USB Debugging enabled.{Colors.RESET}")
            return False

        active_dev = next((d for d in devices if d.serial == self.adb.serial), devices[0])
        if active_dev.is_unauthorized:
            print(f"{Colors.RED}[!] Device ({active_dev.serial}) is UNAUTHORIZED.{Colors.RESET}")
            print("    Please unlock phone and tap 'Allow' on the 'Allow USB debugging' popup dialog.")
            return False

        if not active_dev.is_ready:
            print(f"{Colors.YELLOW}[!] Device is in '{active_dev.state}' state. Check USB cable and phone unlock state.{Colors.RESET}")
            return False

        return True

    def run(self):
        """Main application loop."""
        while True:
            print_banner()
            self.print_status_bar()

            print(f"{Colors.BOLD}MAIN MENU:{Colors.RESET}")
            print(f"  {Colors.CYAN}[1]{Colors.RESET} Check Connection & ADB Authorization Status")
            print(f"  {Colors.CYAN}[2]{Colors.RESET} Inspect Device Hardware & OS (Model, Android Version, Manufacturer, Serial)")
            print(f"  {Colors.CYAN}[3]{Colors.RESET} Inspect Battery Metrics (Level, Status, Health, Temp, Voltage)")
            print(f"  {Colors.CYAN}[4]{Colors.RESET} Inspect Storage Capacity (Total, Used, Free)")
            print(f"  {Colors.CYAN}[5]{Colors.RESET} Browse Files in Shared Storage (/sdcard/Download, etc.)")
            print(f"  {Colors.CYAN}[6]{Colors.RESET} Copy File: Linux Computer -> Android Phone (adb push)")
            print(f"  {Colors.CYAN}[7]{Colors.RESET} Copy File: Android Phone -> Linux Computer (adb pull)")
            print(f"  {Colors.CYAN}[8]{Colors.RESET} Troubleshooting & Kali Linux Setup Guide")
            print(f"  {Colors.RED}[9]{Colors.RESET} Exit AndroidBridge")

            choice = input(f"\n{Colors.BOLD}Select an option [1-9]: {Colors.RESET}").strip()

            if choice == "1":
                self.check_connection()
            elif choice == "2":
                self.inspect_device()
            elif choice == "3":
                self.inspect_battery()
            elif choice == "4":
                self.inspect_storage()
            elif choice == "5":
                self.browse_files()
            elif choice == "6":
                self.copy_linux_to_phone()
            elif choice == "7":
                self.copy_phone_to_linux()
            elif choice == "8":
                self.show_troubleshooting()
            elif choice in ("9", "q", "exit", "quit"):
                print(f"\n{Colors.GREEN}Thank you for using AndroidBridge. Disconnecting session.{Colors.RESET}\n")
                break
            else:
                print(f"\n{Colors.RED}Invalid option '{choice}'. Please select a number between 1 and 9.{Colors.RESET}")

            input(f"\n{Colors.DIM}Press Enter to return to main menu...{Colors.RESET}")


def main_menu():
    app = AndroidBridgeApp()
    try:
        app.run()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Operation cancelled by user (Ctrl+C). Exiting AndroidBridge.{Colors.RESET}\n")
        sys.exit(0)
