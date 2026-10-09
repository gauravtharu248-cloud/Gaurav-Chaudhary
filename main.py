#!/usr/bin/env python3
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
