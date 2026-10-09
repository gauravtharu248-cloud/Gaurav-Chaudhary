"""
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
                # Pick the first authorized device if available, otherwise first device
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
