export interface ProjectFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    name: "main.py",
    path: "main.py",
    language: "python",
    description: "Executable entry point. Launches the interactive terminal menu.",
    content: `#!/usr/bin/env python3
"""
AndroidBridge - Beginner-friendly Python Linux CLI tool for managing and inspecting
Android devices connected through authorized USB debugging.

Usage:
    python3 main.py
"""

import sys
import os

# Ensure package root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from androidbridge.menu import main_menu

if __name__ == "__main__":
    main_menu()
`
  },
  {
    name: "adb_cli.py",
    path: "androidbridge/adb_cli.py",
    language: "python",
    description: "Subprocess wrapper, ADB binary detection, error diagnostics, and device authorization state.",
    content: `"""
adb_cli.py - Subprocess wrapper and connection state checker for Android Debug Bridge.
Handles command execution, error diagnostics, and device authorization detection.
"""

import shutil
import subprocess
from dataclasses import dataclass
from typing import List, Optional, Tuple


@dataclass
class ConnectedDevice:
    serial: str
    state: str  # 'device', 'unauthorized', 'offline', 'no permissions'
    model: str = "Unknown"
    product: str = "Unknown"
    usb: str = ""

    @property
    def is_ready(self) -> bool:
        return self.state == "device"

    @property
    def is_unauthorized(self) -> bool:
        return self.state == "unauthorized"


class ADBManager:
    """Manages ADB daemon checks, device enumeration, and command execution."""

    def __init__(self, serial: Optional[str] = None):
        self.serial = serial
        self._adb_path = shutil.which("adb")

    def is_adb_installed(self) -> bool:
        """Check if the adb executable exists in system PATH."""
        self._adb_path = shutil.which("adb")
        return self._adb_path is not None

    def get_adb_version(self) -> Optional[str]:
        """Return the installed ADB version string."""
        if not self.is_adb_installed():
            return None
        try:
            res = subprocess.run(
                ["adb", "version"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            for line in res.stdout.splitlines():
                if "Android Debug Bridge version" in line:
                    return line.strip()
            return res.stdout.splitlines()[0] if res.stdout else "ADB Installed"
        except Exception:
            return None

    def run_cmd(
        self,
        args: List[str],
        include_device: bool = True,
        timeout: int = 15,
    ) -> Tuple[bool, str, str]:
        """
        Execute an ADB command securely.
        Returns: (success: bool, stdout: str, stderr: str)
        """
        if not self.is_adb_installed():
            return False, "", "ADB is not installed on this system. Run: sudo apt install -y adb"

        cmd = ["adb"]
        if include_device and self.serial:
            cmd.extend(["-s", self.serial])
        cmd.extend(args)

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
            success = res.returncode == 0
            return success, res.stdout.strip(), res.stderr.strip()
        except subprocess.TimeoutExpired:
            return False, "", f"Command timed out after {timeout} seconds."
        except Exception as e:
            return False, "", f"Subprocess error: {str(e)}"

    def run_shell(self, shell_cmd: str, timeout: int = 15) -> Tuple[bool, str, str]:
        """Execute a command inside the Android shell via adb shell."""
        return self.run_cmd(["shell", shell_cmd], timeout=timeout)

    def list_devices(self) -> List[ConnectedDevice]:
        """Enumerate connected Android devices and their authorization status."""
        if not self.is_adb_installed():
            return []

        success, stdout, _ = self.run_cmd(["devices", "-l"], include_device=False, timeout=8)
        if not success or not stdout:
            return []

        devices = []
        lines = stdout.splitlines()

        for line in lines[1:]:  # Skip "List of devices attached"
            line = line.strip()
            if not line:
                continue

            parts = line.split()
            if len(parts) < 2:
                continue

            serial = parts[0]
            state = parts[1]

            model = "Unknown"
            product = "Unknown"
            usb = ""

            for part in parts[2:]:
                if part.startswith("model:"):
                    model = part.split(":", 1)[1]
                elif part.startswith("product:"):
                    product = part.split(":", 1)[1]
                elif part.startswith("usb:"):
                    usb = part.split(":", 1)[1]

            devices.append(
                ConnectedDevice(
                    serial=serial,
                    state=state,
                    model=model,
                    product=product,
                    usb=usb,
                )
            )

        # Update current serial if none set or previous disconnected
        if devices:
            if not self.serial or not any(d.serial == self.serial for d in devices):
                ready_device = next((d for d in devices if d.is_ready), devices[0])
                self.serial = ready_device.serial
        else:
            self.serial = None

        return devices

    def restart_server(self) -> Tuple[bool, str]:
        """Restart local ADB server to resolve hung connections."""
        if not self.is_adb_installed():
            return False, "ADB is not installed."
        try:
            subprocess.run(["adb", "kill-server"], timeout=8, check=False)
            res = subprocess.run(["adb", "start-server"], capture_output=True, text=True, timeout=10, check=False)
            if res.returncode == 0:
                return True, "ADB server successfully restarted."
            return False, f"Failed to start ADB server: {res.stderr}"
        except Exception as e:
            return False, str(e)
`
  },
  {
    name: "device_info.py",
    path: "androidbridge/device_info.py",
    language: "python",
    description: "Collects hardware specs, OS version, manufacturer, and battery health via getprop & dumpsys.",
    content: `"""
device_info.py - Collects hardware, operating system, and battery status
from an authorized Android device via standard ADB getprop and dumpsys utilities.
"""

from dataclasses import dataclass
from typing import Optional
from .adb_cli import ADBManager


@dataclass
class DeviceDetails:
    manufacturer: str
    model: str
    market_name: str
    android_version: str
    sdk_level: str
    serial_number: str
    build_id: str
    cpu_abi: str


@dataclass
class BatteryStatus:
    level: int  # percentage (0-100)
    scale: int
    is_charging: bool
    power_source: str  # AC, USB, Wireless, Battery
    status: str  # Charging, Discharging, Full, Not Charging
    health: str  # Good, Overheat, Dead, Over Voltage, Unspecified
    temperature_c: float
    temperature_f: float
    voltage_mv: int


class DeviceInspector:
    """Queries hardware identity and battery metrics."""

    def __init__(self, adb: ADBManager):
        self.adb = adb

    def get_device_details(self) -> Optional[DeviceDetails]:
        """Fetch model, Android version, manufacturer, and serial number."""
        success, stdout, _ = self.adb.run_shell("getprop")
        if not success or not stdout:
            return None

        props = {}
        for line in stdout.splitlines():
            line = line.strip()
            if line.startswith("[") and "]: [" in line:
                try:
                    key, val = line.split("]: [", 1)
                    key = key.lstrip("[").strip()
                    val = val.rstrip("]").strip()
                    props[key] = val
                except ValueError:
                    continue

        manufacturer = props.get("ro.product.manufacturer", "Unknown").capitalize()
        model = props.get("ro.product.model", "Unknown")
        market_name = props.get("ro.product.marketname", model)
        android_version = props.get("ro.build.version.release", "Unknown")
        sdk_level = props.get("ro.build.version.sdk", "Unknown")
        build_id = props.get("ro.build.display.id", props.get("ro.build.id", "Unknown"))
        cpu_abi = props.get("ro.product.cpu.abi", "Unknown")
        serial = props.get("ro.serialno", self.adb.serial or "Unknown")

        return DeviceDetails(
            manufacturer=manufacturer,
            model=model,
            market_name=market_name,
            android_version=android_version,
            sdk_level=sdk_level,
            serial_number=serial,
            build_id=build_id,
            cpu_abi=cpu_abi,
        )

    def get_battery_status(self) -> Optional[BatteryStatus]:
        """Fetch battery level, health, temperature, and charging status via dumpsys battery."""
        success, stdout, _ = self.adb.run_shell("dumpsys battery")
        if not success or not stdout:
            return None

        data = {}
        for line in stdout.splitlines():
            line = line.strip()
            if ":" in line:
                parts = line.split(":", 1)
                data[parts[0].strip().lower()] = parts[1].strip()

        try:
            level = int(data.get("level", 0))
            scale = int(data.get("scale", 100))
            level_pct = int((level / scale) * 100) if scale > 0 else level
        except ValueError:
            level_pct = 0
            scale = 100

        ac_powered = data.get("ac powered", "false").lower() == "true"
        usb_powered = data.get("usb powered", "false").lower() == "true"
        wireless_powered = data.get("wireless powered", "false").lower() == "true"

        if ac_powered:
            power_source = "AC Wall Charger"
            is_charging = True
        elif usb_powered:
            power_source = "USB Cable (PC/Host)"
            is_charging = True
        elif wireless_powered:
            power_source = "Wireless Dock"
            is_charging = True
        else:
            power_source = "Discharging (Battery)"
            is_charging = False

        status_code = data.get("status", "1")
        status_map = {
            "1": "Unknown",
            "2": "Charging",
            "3": "Discharging",
            "4": "Not Charging",
            "5": "Full",
        }
        status_str = status_map.get(status_code, "Discharging" if not is_charging else "Charging")

        health_code = data.get("health", "2")
        health_map = {
            "1": "Unknown",
            "2": "Good (Healthy)",
            "3": "Overheat Warning",
            "4": "Dead / Needs Replacement",
            "5": "Over Voltage",
            "6": "Unspecified Failure",
            "7": "Cold",
        }
        health_str = health_map.get(health_code, "Good")

        try:
            temp_raw = float(data.get("temperature", 250))
            temp_c = temp_raw / 10.0
            temp_f = (temp_c * 9.0 / 5.0) + 32.0
        except ValueError:
            temp_c = 25.0
            temp_f = 77.0

        try:
            voltage_mv = int(data.get("voltage", 3800))
        except ValueError:
            voltage_mv = 3800

        return BatteryStatus(
            level=level_pct,
            scale=scale,
            is_charging=is_charging,
            power_source=power_source,
            status=status_str,
            health=health_str,
            temperature_c=temp_c,
            temperature_f=temp_f,
            voltage_mv=voltage_mv,
        )
`
  },
  {
    name: "storage_manager.py",
    path: "androidbridge/storage_manager.py",
    language: "python",
    description: "Queries df for shared storage utilization and safe folder browsing with path-traversal guard.",
    content: `"""
storage_manager.py - Inspects internal shared storage capacity
and safely browses files in authorized user-accessible shared directories.
"""

import os
from dataclasses import dataclass
from typing import List, Optional, Tuple
from .adb_cli import ADBManager


@dataclass
class StorageCapacity:
    mount_point: str
    filesystem: str
    total_human: str
    used_human: str
    free_human: str
    percent_used: int


@dataclass
class FileEntry:
    name: str
    path: str
    is_dir: bool
    size_human: str
    date: str
    permissions: str


SHARED_STORAGE_PRESETS = [
    ("/sdcard/Download", "Downloads folder (browser downloads, documents)"),
    ("/sdcard/DCIM", "Camera & Gallery photos/videos"),
    ("/sdcard/Documents", "User documents"),
    ("/sdcard/Pictures", "Saved images & screenshots"),
    ("/sdcard/Music", "Audio & music files"),
    ("/sdcard/Movies", "Recorded or downloaded video files"),
    ("/sdcard", "Root of internal shared storage (/sdcard)"),
]

ALLOWED_SHARED_ROOTS = (
    "/sdcard",
    "/storage/emulated/0",
    "/sdcard/",
    "/storage/emulated/0/",
)


class StorageManager:
    """Handles storage metrics and authorized file browsing on shared storage."""

    def __init__(self, adb: ADBManager):
        self.adb = adb

    def get_storage_info(self) -> Optional[StorageCapacity]:
        """Fetch primary shared storage usage using df -h /sdcard."""
        success, stdout, _ = self.adb.run_shell("df -h /sdcard /data")
        if not success or not stdout:
            success, stdout, _ = self.adb.run_shell("df /sdcard")
            if not success or not stdout:
                return None

        lines = [line.strip() for line in stdout.splitlines() if line.strip()]
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 5:
                mount = parts[-1]
                if mount in ("/sdcard", "/storage/emulated/0", "/data"):
                    pct_col = next((p for p in parts if p.endswith("%")), "0%")
                    try:
                        pct_val = int(pct_col.rstrip("%"))
                    except ValueError:
                        pct_val = 0

                    return StorageCapacity(
                        mount_point=mount,
                        filesystem=parts[0],
                        total_human=parts[1],
                        used_human=parts[2],
                        free_human=parts[3],
                        percent_used=pct_val,
                    )
        return None

    def sanitize_shared_path(self, target_path: str) -> Tuple[bool, str, str]:
        """Validate path stays strictly inside user shared storage (/sdcard)."""
        cleaned = os.path.normpath(target_path.strip())
        if not cleaned.startswith("/"):
            cleaned = "/sdcard/" + cleaned.lstrip("./")

        if not (cleaned.startswith("/sdcard") or cleaned.startswith("/storage/emulated/0")):
            return False, "", "Access denied: Path must be located inside user shared storage (/sdcard/)."

        if not any(cleaned.startswith(root) for root in ALLOWED_SHARED_ROOTS):
            return False, "", "Access denied: AndroidBridge only accesses user-authorized shared storage."

        return True, cleaned, ""

    def list_directory(self, dir_path: str = "/sdcard/Download") -> Tuple[bool, List[FileEntry], str]:
        """List files and folders in an authorized shared directory."""
        valid, safe_path, err = self.sanitize_shared_path(dir_path)
        if not valid:
            return False, [], err

        cmd = f'ls -la "{safe_path}"'
        success, stdout, stderr = self.adb.run_shell(cmd)

        if not success:
            if "Permission denied" in stderr or "Permission denied" in stdout:
                return False, [], f"Permission denied on {safe_path}. (Verify phone screen is unlocked)"
            return False, [], f"Failed to list directory: {stderr or stdout}"

        entries: List[FileEntry] = []
        for line in stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("total "):
                continue

            parts = line.split(None, 7)
            if len(parts) < 8:
                parts = line.split(None, 6)
                if len(parts) < 7:
                    continue
                perms = parts[0]
                size_str = parts[4]
                date_str = f"{parts[5]} {parts[6]}"
                name = parts[-1]
            else:
                perms = parts[0]
                size_str = parts[4]
                date_str = f"{parts[5]} {parts[6]}"
                name = parts[7]

            if name in (".", ".."):
                continue

            is_dir = perms.startswith("d")
            try:
                size_bytes = int(size_str)
                if is_dir:
                    size_human = "DIR"
                elif size_bytes < 1024:
                    size_human = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_human = f"{size_bytes / 1024:.1f} KB"
                elif size_bytes < 1024 * 1024 * 1024:
                    size_human = f"{size_bytes / (1024 * 1024):.1f} MB"
                else:
                    size_human = f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
            except ValueError:
                size_human = size_str

            entries.append(
                FileEntry(
                    name=name,
                    path=f"{safe_path.rstrip('/')}/{name}",
                    is_dir=is_dir,
                    size_human=size_human,
                    date=date_str,
                    permissions=perms,
                )
            )

        entries.sort(key=lambda x: (not x.is_dir, x.name.lower()))
        return True, entries, ""
`
  },
  {
    name: "transfer_manager.py",
    path: "androidbridge/transfer_manager.py",
    language: "python",
    description: "Safe file pushing (Linux -> Android) and pulling (Android -> Linux) with input validation.",
    content: `"""
transfer_manager.py - Manages bidirectional authorized file copying
between the Linux host machine and the Android device's shared storage using adb push and adb pull.
"""

import os
import time
from dataclasses import dataclass
from typing import Tuple
from .adb_cli import ADBManager
from .storage_manager import StorageManager


@dataclass
class TransferResult:
    success: bool
    direction: str
    source_path: str
    destination_path: str
    bytes_transferred: int
    duration_seconds: float
    message: str


class TransferManager:
    """Safely executes authorized file push/pull operations."""

    def __init__(self, adb: ADBManager, storage: StorageManager):
        self.adb = adb
        self.storage = storage

    def push_to_device(
        self,
        local_file_path: str,
        device_destination_path: str = "/sdcard/Download/",
    ) -> TransferResult:
        start_time = time.time()
        expanded_local = os.path.abspath(os.path.expanduser(local_file_path.strip()))

        if not os.path.exists(expanded_local):
            return TransferResult(
                success=False,
                direction="Host -> Android (push)",
                source_path=local_file_path,
                destination_path=device_destination_path,
                bytes_transferred=0,
                duration_seconds=0.0,
                message=f"Local file not found on Linux: {expanded_local}",
            )

        if os.path.isdir(expanded_local):
            return TransferResult(
                success=False,
                direction="Host -> Android (push)",
                source_path=local_file_path,
                destination_path=device_destination_path,
                bytes_transferred=0,
                duration_seconds=0.0,
                message="Source is a directory. Specify a single file.",
            )

        file_size = os.path.getsize(expanded_local)
        valid, safe_remote_dest, err = self.storage.sanitize_shared_path(device_destination_path)
        if not valid:
            return TransferResult(
                success=False,
                direction="Host -> Android (push)",
                source_path=expanded_local,
                destination_path=device_destination_path,
                bytes_transferred=0,
                duration_seconds=0.0,
                message=f"Security restriction: {err}",
            )

        success, stdout, stderr = self.adb.run_cmd(["push", expanded_local, safe_remote_dest], timeout=120)
        duration = max(0.01, time.time() - start_time)

        if success:
            filename = os.path.basename(expanded_local)
            final_target = f"{safe_remote_dest.rstrip('/')}/{filename}"
            return TransferResult(
                success=True,
                direction="Host -> Android (push)",
                source_path=expanded_local,
                destination_path=final_target,
                bytes_transferred=file_size,
                duration_seconds=duration,
                message=f"File successfully copied to phone: {final_target}",
            )
        else:
            return TransferResult(
                success=False,
                direction="Host -> Android (push)",
                source_path=expanded_local,
                destination_path=safe_remote_dest,
                bytes_transferred=0,
                duration_seconds=duration,
                message=f"ADB Push failed: {stderr or stdout}",
            )

    def pull_from_device(
        self,
        device_file_path: str,
        local_destination_folder: str = "~/Downloads",
    ) -> TransferResult:
        start_time = time.time()
        valid, safe_remote_src, err = self.storage.sanitize_shared_path(device_file_path)
        if not valid:
            return TransferResult(
                success=False,
                direction="Android -> Host (pull)",
                source_path=device_file_path,
                destination_path=local_destination_folder,
                bytes_transferred=0,
                duration_seconds=0.0,
                message=f"Security restriction: {err}",
            )

        expanded_local_dir = os.path.abspath(os.path.expanduser(local_destination_folder.strip()))
        os.makedirs(expanded_local_dir, exist_ok=True)

        filename = os.path.basename(safe_remote_src)
        target_local_file = os.path.join(expanded_local_dir, filename)

        success, stdout, stderr = self.adb.run_cmd(["pull", safe_remote_src, target_local_file], timeout=120)
        duration = max(0.01, time.time() - start_time)

        if success and os.path.exists(target_local_file):
            size = os.path.getsize(target_local_file)
            return TransferResult(
                success=True,
                direction="Android -> Host (pull)",
                source_path=safe_remote_src,
                destination_path=target_local_file,
                bytes_transferred=size,
                duration_seconds=duration,
                message=f"File successfully pulled from phone to: {target_local_file}",
            )
        else:
            return TransferResult(
                success=False,
                direction="Android -> Host (pull)",
                source_path=safe_remote_src,
                destination_path=target_local_file,
                bytes_transferred=0,
                duration_seconds=duration,
                message=f"ADB Pull failed: {stderr or stdout}",
            )
`
  },
  {
    name: "menu.py",
    path: "androidbridge/menu.py",
    language: "python",
    description: "Interactive ANSI terminal menu with clear numbered options and user guidance.",
    content: `"""
menu.py - Beginner-friendly terminal interface for AndroidBridge.
Provides interactive navigation, diagnostic advice, and color-coded statuses.
"""

import os
import sys
from typing import Optional
from .adb_cli import ADBManager, ConnectedDevice
from .device_info import DeviceInspector
from .storage_manager import StorageManager, SHARED_STORAGE_PRESETS
from .transfer_manager import TransferManager

class Colors:
    HEADER = "\\033[95m"
    BLUE = "\\033[94m"
    CYAN = "\\033[96m"
    GREEN = "\\033[92m"
    YELLOW = "\\033[93m"
    RED = "\\033[91m"
    BOLD = "\\033[1m"
    DIM = "\\033[2m"
    RESET = "\\033[0m"


def print_banner():
    banner = f"""
{Colors.CYAN}{Colors.BOLD}========================================================================
    ___              __           _     ______       _     __           
   /   |  ____  ____/ /________  (_)___/ / __ )_____(_)___/ /___ ____   
  / /| | / __ \\\\/ __  / ___/ __ \\\\/ / __  / __  / ___/ / __  / __ \`/ _ \\\\  
 / ___ |/ / / / /_/ / /  / /_/ / / /_/ / /_/ / /  / / /_/ / /_/ /  __/  
/_/  |_/_/ /_/\\\\__,_/_/   \\\\____/_/\\\\__,_/_____/_/  /_/\\\\__,_/\\\\__, /\\\\___/   
                                                         /____/         
{Colors.RESET}{Colors.DIM}   Android USB Debugging Bridge & Device Inspector for Linux / Kali   {Colors.RESET}
{Colors.CYAN}========================================================================{Colors.RESET}
"""
    print(banner)


class AndroidBridgeApp:
    def __init__(self):
        self.adb = ADBManager()
        self.inspector = DeviceInspector(self.adb)
        self.storage = StorageManager(self.adb)
        self.transfer = TransferManager(self.adb, self.storage)

    def print_status_bar(self) -> Optional[ConnectedDevice]:
        if not self.adb.is_adb_installed():
            print(f"[{Colors.RED}STATUS: ADB NOT INSTALLED{Colors.RESET}] - Run: sudo apt install -y adb\\n")
            return None

        devices = self.adb.list_devices()
        if not devices:
            print(f"[{Colors.YELLOW}STATUS: NO DEVICE DETECTED{Colors.RESET}] - Connect phone via USB with USB Debugging enabled.\\n")
            return None

        active_dev = next((d for d in devices if d.serial == self.adb.serial), devices[0])
        if active_dev.is_ready:
            print(f"[{Colors.GREEN}STATUS: CONNECTED & AUTHORIZED{Colors.RESET}] Device: {active_dev.model} (Serial: {active_dev.serial})\\n")
            return active_dev
        elif active_dev.is_unauthorized:
            print(f"[{Colors.RED}{Colors.BOLD}STATUS: UNAUTHORIZED{Colors.RESET}] Prompt pending on phone screen! Tap 'Allow USB debugging'.\\n")
            return active_dev
        else:
            print(f"[{Colors.YELLOW}STATUS: {active_dev.state.upper()}{Colors.RESET}] Device: {active_dev.serial}\\n")
            return active_dev

    def check_connection(self):
        print(f"\\n{Colors.BOLD}--- [1] Checking Connection & Authorization Status ---{Colors.RESET}\\n")
        if not self.adb.is_adb_installed():
            print(f"{Colors.RED}[!] ADB binary not found on this Linux system.{Colors.RESET}")
            print(f"\\n{Colors.BOLD}How to fix on Kali Linux / Debian / Ubuntu:{Colors.RESET}")
            print(f"  {Colors.CYAN}sudo apt update && sudo apt install -y adb{Colors.RESET}")
            return

        version = self.adb.get_adb_version()
        print(f"{Colors.GREEN}[✓]{Colors.RESET} ADB is installed: {Colors.DIM}{version}{Colors.RESET}")

        devices = self.adb.list_devices()
        if not devices:
            print(f"\\n{Colors.YELLOW}[!] No connected Android devices detected.{Colors.RESET}")
            print("Troubleshooting checklist:")
            print("  1. Connect your Android phone to this Linux computer with a USB cable.")
            print("  2. In Developer Options: Toggle ON 'USB Debugging'.")
            print("  3. Set USB mode to 'File Transfer (MTP)'.")
            return

        for idx, dev in enumerate(devices, 1):
            badge = f"{Colors.GREEN}[READY]{Colors.RESET}" if dev.is_ready else f"{Colors.RED}[{dev.state.upper()}]{Colors.RESET}"
            print(f"  {idx}. Serial: {Colors.BOLD}{dev.serial}{Colors.RESET} | Model: {dev.model} | State: {badge}")

    def inspect_device(self):
        print(f"\\n{Colors.BOLD}--- [2] Inspecting Device Hardware & OS ---{Colors.RESET}\\n")
        if not self._ensure_device_ready():
            return
        details = self.inspector.get_device_details()
        if not details:
            print(f"{Colors.RED}[!] Failed to read system properties.{Colors.RESET}")
            return
        print(f"  Manufacturer      : {details.manufacturer}")
        print(f"  Model             : {details.model} ({details.market_name})")
        print(f"  Android Version   : {details.android_version} (SDK: {details.sdk_level})")
        print(f"  Serial Number     : {details.serial_number}")
        print(f"  CPU ABI           : {details.cpu_abi}")

    def inspect_battery(self):
        print(f"\\n{Colors.BOLD}--- [3] Inspecting Battery Level & Health ---{Colors.RESET}\\n")
        if not self._ensure_device_ready():
            return
        battery = self.inspector.get_battery_status()
        if not battery:
            print(f"{Colors.RED}[!] Could not retrieve battery metrics.{Colors.RESET}")
            return
        print(f"  Battery Level     : {battery.level}%")
        print(f"  Charging Status   : {battery.status} ({battery.power_source})")
        print(f"  Battery Health    : {battery.health}")
        print(f"  Temperature       : {battery.temperature_c:.1f}°C")
        print(f"  Voltage           : {battery.voltage_mv} mV")

    def inspect_storage(self):
        print(f"\\n{Colors.BOLD}--- [4] Inspecting Storage Capacity ---{Colors.RESET}\\n")
        if not self._ensure_device_ready():
            return
        storage = self.storage.get_storage_info()
        if not storage:
            print(f"{Colors.RED}[!] Could not retrieve storage statistics.{Colors.RESET}")
            return
        print(f"  Mount Point       : {storage.mount_point}")
        print(f"  Total Capacity    : {storage.total_human}")
        print(f"  Used Space        : {storage.used_human}")
        print(f"  Available Space   : {storage.free_human}")
        print(f"  Usage Percentage  : {storage.percent_used}%")

    def _ensure_device_ready(self) -> bool:
        if not self.adb.is_adb_installed():
            print(f"{Colors.RED}[!] ADB is not installed.{Colors.RESET}")
            return False
        devices = self.adb.list_devices()
        if not devices:
            print(f"{Colors.YELLOW}[!] No Android phone detected via USB.{Colors.RESET}")
            return False
        active_dev = next((d for d in devices if d.serial == self.adb.serial), devices[0])
        if active_dev.is_unauthorized:
            print(f"{Colors.RED}[!] Device ({active_dev.serial}) is UNAUTHORIZED.{Colors.RESET}")
            print("    Please unlock phone and tap 'Allow' on 'Allow USB debugging'.")
            return False
        return True

    def run(self):
        while True:
            print_banner()
            self.print_status_bar()
            print("MAIN MENU:")
            print("  [1] Check Connection & ADB Authorization Status")
            print("  [2] Inspect Device Hardware & OS")
            print("  [3] Inspect Battery Metrics")
            print("  [4] Inspect Storage Capacity")
            print("  [5] Browse Files in Shared Storage")
            print("  [6] Copy File: Linux -> Android (adb push)")
            print("  [7] Copy File: Android -> Linux (adb pull)")
            print("  [8] Troubleshooting & Kali Linux Setup Guide")
            print("  [9] Exit AndroidBridge")
            choice = input("\\nSelect an option [1-9]: ").strip()
            if choice == "1":
                self.check_connection()
            elif choice == "2":
                self.inspect_device()
            elif choice == "3":
                self.inspect_battery()
            elif choice == "4":
                self.inspect_storage()
            elif choice == "9":
                break
            input("\\nPress Enter to return to main menu...")

def main_menu():
    app = AndroidBridgeApp()
    app.run()
`
  },
  {
    name: "setup_kali.sh",
    path: "setup_kali.sh",
    language: "bash",
    description: "Automated bash installer for Kali Linux: installs adb, configures udev rules, starts daemon.",
    content: `#!/usr/bin/env bash
# AndroidBridge - Automated Setup Script for Kali Linux & Debian
set -e

GREEN="\\033[92m"
CYAN="\\033[96m"
YELLOW="\\033[93m"
RED="\\033[91m"
BOLD="\\033[1m"
RESET="\\033[0m"

echo -e "\${CYAN}\${BOLD}"
echo "=========================================================="
echo "         AndroidBridge - Setup for Kali Linux            "
echo "=========================================================="
echo -e "\${RESET}"

# 1. Check Python 3
echo -e "\${CYAN}[1/5] Checking Python 3 installation...\${RESET}"
if command -v python3 >/dev/null 2>&1; then
    echo -e "\${GREEN}✓ Found: \$(python3 --version)\${RESET}"
else
    sudo apt-get update && sudo apt-get install -y python3
fi

# 2. Update package lists and install ADB
echo -e "\\n\${CYAN}[2/5] Installing Android Debug Bridge (adb)...\${RESET}"
if command -v adb >/dev/null 2>&1; then
    echo -e "\${GREEN}✓ ADB is already installed: \$(adb version | head -n 1)\${RESET}"
else
    sudo apt-get update && sudo apt-get install -y adb
fi

# 3. Configure Android udev rules
echo -e "\\n\${CYAN}[3/5] Configuring Android udev rules...\${RESET}"
RULES_FILE="/etc/udev/rules.d/51-android.rules"
if [ ! -f "$RULES_FILE" ]; then
    sudo bash -c 'cat << "EOF" > /etc/udev/rules.d/51-android.rules
SUBSYSTEM=="usb", ATTR{idVendor}!="", MODE="0666", GROUP="plugdev"
EOF'
    sudo udevadm control --reload-rules 2>/dev/null || true
    sudo udevadm trigger 2>/dev/null || true
fi

# 4. Make main.py executable
echo -e "\\n\${CYAN}[4/5] Making AndroidBridge executable...\${RESET}"
chmod +x main.py

# 5. Start ADB server
echo -e "\\n\${CYAN}[5/5] Starting ADB Daemon...\${RESET}"
adb start-server

echo -e "\\n\${GREEN}\${BOLD}Setup Complete! Launch with: python3 main.py\${RESET}"
`
  },
  {
    name: "requirements.txt",
    path: "requirements.txt",
    language: "text",
    description: "Runtime requirements: pure Python 3 Standard Library only.",
    content: `# AndroidBridge Requirements
# AndroidBridge uses the Python 3 Standard Library only!
# No pip installations required.
# Prerequisites:
# - python3 (>= 3.8)
# - adb (apt install -y adb)
`
  },
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    description: "Complete user manual, Kali Linux instructions, ethical boundaries, and commands.",
    content: `# AndroidBridge

A beginner-friendly Python Linux CLI tool for inspecting and managing your Android smartphone over authorized USB debugging.

## Kali Linux Quick Start
\`\`\`bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y adb python3

# 2. Connect your phone via USB with USB Debugging enabled

# 3. Run AndroidBridge
python3 main.py
\`\`\`
`
  }
];
