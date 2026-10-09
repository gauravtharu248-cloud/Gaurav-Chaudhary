"""
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
    raw_total_kb: int = 0
    raw_used_kb: int = 0
    raw_free_kb: int = 0


@dataclass
class FileEntry:
    name: str
    path: str
    is_dir: bool
    size_human: str
    date: str
    permissions: str


# Preset user-accessible shared directories in standard Android external storage
SHARED_STORAGE_PRESETS = [
    ("/sdcard/Download", "Downloads folder (browser downloads, documents)"),
    ("/sdcard/DCIM", "Camera & Gallery photos/videos"),
    ("/sdcard/Documents", "User documents"),
    ("/sdcard/Pictures", "Saved images & screenshots"),
    ("/sdcard/Music", "Audio & music files"),
    ("/sdcard/Movies", "Recorded or downloaded video files"),
    ("/sdcard", "Root of internal shared storage (/sdcard)"),
]

# Root paths that are considered authorized user shared storage
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
        """Fetch primary shared storage usage using df -h /sdcard or /data."""
        # Query disk space for /sdcard or /storage/emulated/0
        success, stdout, _ = self.adb.run_shell("df -h /sdcard /data")
        if not success or not stdout:
            # Fallback to plain df
            success, stdout, _ = self.adb.run_shell("df /sdcard")
            if not success or not stdout:
                return None

        lines = [line.strip() for line in stdout.splitlines() if line.strip()]
        # Typically line 0 is header: Filesystem Size Used Avail Use% Mounted on
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 5:
                # df output columns can vary slightly between Android versions
                # e.g.: /dev/fuse 110G 54G 56G 50% /storage/emulated/0
                mount = parts[-1]
                if mount in ("/sdcard", "/storage/emulated/0", "/data"):
                    # Find percentage column
                    pct_col = next((p for p in parts if p.endswith("%")), "0%")
                    try:
                        pct_val = int(pct_col.rstrip("%"))
                    except ValueError:
                        pct_val = 0

                    filesystem = parts[0]
                    total = parts[1] if len(parts) > 1 else "Unknown"
                    used = parts[2] if len(parts) > 2 else "Unknown"
                    free = parts[3] if len(parts) > 3 else "Unknown"

                    return StorageCapacity(
                        mount_point=mount,
                        filesystem=filesystem,
                        total_human=total,
                        used_human=used,
                        free_human=free,
                        percent_used=pct_val,
                    )

        # Fallback parsing first entry if exact mount not found
        if len(lines) > 1:
            parts = lines[1].split()
            if len(parts) >= 5:
                pct_col = next((p for p in parts if p.endswith("%")), "0%")
                try:
                    pct_val = int(pct_col.rstrip("%"))
                except ValueError:
                    pct_val = 0
                return StorageCapacity(
                    mount_point=parts[-1],
                    filesystem=parts[0],
                    total_human=parts[1],
                    used_human=parts[2],
                    free_human=parts[3],
                    percent_used=pct_val,
                )

        return None

    def sanitize_shared_path(self, target_path: str) -> Tuple[bool, str, str]:
        """
        Validate that the target path is strictly within user shared storage.
        Prevents directory traversal attacks ('../') and unauthorized access to private app sandboxes.
        """
        cleaned = os.path.normpath(target_path.strip())
        if not cleaned.startswith("/"):
            cleaned = "/sdcard/" + cleaned.lstrip("./")

        # Resolve known aliases
        if cleaned.startswith("/sdcard"):
            normalized_check = cleaned
        elif cleaned.startswith("/storage/emulated/0"):
            normalized_check = cleaned
        else:
            return False, "", "Access denied: Path must be located inside user shared storage (/sdcard/)."

        # Ensure no traversal above allowed roots
        if not any(normalized_check.startswith(root) for root in ALLOWED_SHARED_ROOTS):
            return False, "", "Access denied: AndroidBridge only accesses user-authorized shared storage."

        return True, cleaned, ""

    def list_directory(self, dir_path: str = "/sdcard/Download") -> Tuple[bool, List[FileEntry], str]:
        """
        List files and folders in an authorized shared directory.
        Uses adb shell ls -la.
        """
        valid, safe_path, err = self.sanitize_shared_path(dir_path)
        if not valid:
            return False, [], err

        # Run ls -la
        # Escaped path in quotes
        quoted_path = f'"{safe_path}"'
        cmd = f"ls -la {quoted_path}"
        success, stdout, stderr = self.adb.run_shell(cmd)

        if not success:
            if "Permission denied" in stderr or "Permission denied" in stdout:
                return False, [], f"Permission denied on {safe_path}. (Verify phone screen is unlocked and permissions granted)"
            if "No such file" in stderr or "No such file" in stdout:
                return False, [], f"Directory does not exist: {safe_path}"
            return False, [], f"Failed to list directory: {stderr or stdout}"

        entries: List[FileEntry] = []
        for line in stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("total "):
                continue

            parts = line.split(None, 7)
            if len(parts) < 8:
                # Some toybox/toolbox ls outputs format with fewer columns: permissions links user group size date time name
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

            # Human readable size
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

            full_item_path = f"{safe_path.rstrip('/')}/{name}"
            entries.append(
                FileEntry(
                    name=name,
                    path=full_item_path,
                    is_dir=is_dir,
                    size_human=size_human,
                    date=date_str,
                    permissions=perms,
                )
            )

        # Sort: directories first, then alphabetical
        entries.sort(key=lambda x: (not x.is_dir, x.name.lower()))
        return True, entries, ""
