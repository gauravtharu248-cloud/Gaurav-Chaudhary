"""
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
    direction: str  # 'Host -> Android (push)' or 'Android -> Host (pull)'
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
        """
        Copy a file from the Linux computer to the Android phone's shared storage.
        """
        start_time = time.time()

        # Expand user home path (e.g. ~/myfile.txt)
        expanded_local = os.path.abspath(os.path.expanduser(local_file_path.strip()))

        # Check local file existence
        if not os.path.exists(expanded_local):
            return TransferResult(
                success=False,
                direction="Host -> Android (push)",
                source_path=local_file_path,
                destination_path=device_destination_path,
                bytes_transferred=0,
                duration_seconds=0.0,
                message=f"Local file not found on Linux system: {expanded_local}",
            )

        if os.path.isdir(expanded_local):
            return TransferResult(
                success=False,
                direction="Host -> Android (push)",
                source_path=local_file_path,
                destination_path=device_destination_path,
                bytes_transferred=0,
                duration_seconds=0.0,
                message="Source is a directory. Please specify a single file to copy.",
            )

        file_size = os.path.getsize(expanded_local)

        # Validate destination Android path
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

        # Execute adb push
        success, stdout, stderr = self.adb.run_cmd(
            ["push", expanded_local, safe_remote_dest],
            timeout=120,
        )

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
                message=f"File successfully copied to phone: {final_target} ({stdout})",
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
        """
        Copy a file from the Android phone's shared storage to the Linux computer.
        """
        start_time = time.time()

        # Sanitize device path
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

        # Prepare local destination directory
        expanded_local_dir = os.path.abspath(os.path.expanduser(local_destination_folder.strip()))
        try:
            os.makedirs(expanded_local_dir, exist_ok=True)
        except Exception as e:
            return TransferResult(
                success=False,
                direction="Android -> Host (pull)",
                source_path=safe_remote_src,
                destination_path=expanded_local_dir,
                bytes_transferred=0,
                duration_seconds=0.0,
                message=f"Cannot create local destination directory: {str(e)}",
            )

        # Run adb pull
        filename = os.path.basename(safe_remote_src)
        target_local_file = os.path.join(expanded_local_dir, filename)

        success, stdout, stderr = self.adb.run_cmd(
            ["pull", safe_remote_src, target_local_file],
            timeout=120,
        )

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
                message=f"File successfully pulled from phone to: {target_local_file} ({stdout})",
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
