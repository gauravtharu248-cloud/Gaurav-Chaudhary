"""
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

        # Serial from getprop or directly from ADB
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

        # Parse level & scale
        try:
            level = int(data.get("level", 0))
            scale = int(data.get("scale", 100))
            level_pct = int((level / scale) * 100) if scale > 0 else level
        except ValueError:
            level_pct = 0
            scale = 100

        # Power source
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

        # Status code (Android BatteryManager constants)
        # 1: UNKNOWN, 2: CHARGING, 3: DISCHARGING, 4: NOT_CHARGING, 5: FULL
        status_code = data.get("status", "1")
        status_map = {
            "1": "Unknown",
            "2": "Charging",
            "3": "Discharging",
            "4": "Not Charging",
            "5": "Full",
        }
        status_str = status_map.get(status_code, "Discharging" if not is_charging else "Charging")

        # Health code
        # 1: UNKNOWN, 2: GOOD, 3: OVERHEAT, 4: DEAD, 5: OVER_VOLTAGE, 6: UNSPECIFIED_FAILURE, 7: COLD
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

        # Temperature (tenths of degree Celsius in Android)
        try:
            temp_raw = float(data.get("temperature", 250))
            temp_c = temp_raw / 10.0
            temp_f = (temp_c * 9.0 / 5.0) + 32.0
        except ValueError:
            temp_c = 25.0
            temp_f = 77.0

        # Voltage (in millivolts)
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
