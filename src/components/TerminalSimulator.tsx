import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  RotateCcw, 
  Sliders, 
  Smartphone, 
  ShieldAlert, 
  CheckCircle2, 
  WifiOff,
  Copy,
  Check
} from 'lucide-react';

export type DeviceStateMode = 'authorized_pixel' | 'authorized_samsung' | 'unauthorized' | 'no_device' | 'adb_missing';

interface HistoryLine {
  id: string;
  type: 'output' | 'input' | 'system' | 'error' | 'success';
  text: string;
}

export function TerminalSimulator() {
  const [deviceMode, setDeviceMode] = useState<DeviceStateMode>('authorized_pixel');
  const [inputVal, setInputVal] = useState('');
  const [lines, setLines] = useState<HistoryLine[]>([]);
  const [subPrompt, setSubPrompt] = useState<{ step: string; data?: any } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getDeviceBadge = () => {
    switch (deviceMode) {
      case 'authorized_pixel':
        return { text: 'CONNECTED & AUTHORIZED', color: 'text-emerald-400', model: 'Pixel 8 (Serial: 28241FDH200389)' };
      case 'authorized_samsung':
        return { text: 'CONNECTED & AUTHORIZED', color: 'text-emerald-400', model: 'Galaxy S24 (Serial: R5CR907X2YA)' };
      case 'unauthorized':
        return { text: 'UNAUTHORIZED (RSA PROMPT PENDING)', color: 'text-rose-400', model: 'Android Device (Serial: 28241FDH200389)' };
      case 'no_device':
        return { text: 'NO DEVICE DETECTED', color: 'text-amber-400', model: 'None' };
      case 'adb_missing':
        return { text: 'ADB NOT INSTALLED', color: 'text-rose-500', model: 'N/A' };
    }
  };

  const initBanner = () => {
    const badge = getDeviceBadge();
    const bannerLines: HistoryLine[] = [
      { id: 'b1', type: 'system', text: '========================================================================' },
      { id: 'b2', type: 'system', text: '    ___              __           _     ______       _     __           ' },
      { id: 'b3', type: 'system', text: '   /   |  ____  ____/ /________  (_)___/ / __ )_____(_)___/ /___ ____   ' },
      { id: 'b4', type: 'system', text: '  / /| | / __ \\/ __  / ___/ __ \\/ / __  / __  / ___/ / __  / __ `/ _ \\  ' },
      { id: 'b5', type: 'system', text: ' / ___ |/ / / / /_/ / /  / /_/ / / /_/ / /_/ / /  / / /_/ / /_/ /  __/  ' },
      { id: 'b6', type: 'system', text: '/_/  |_/_/ /_/\\__,_/_/   \\____/_/\\__,_/_____/_/  /_/\\__,_/\\__, /\\___/   ' },
      { id: 'b7', type: 'system', text: '                                                         /____/         ' },
      { id: 'b8', type: 'system', text: '   Android USB Debugging Bridge & Device Inspector for Linux / Kali     ' },
      { id: 'b9', type: 'system', text: '========================================================================' },
      { id: 'b10', type: deviceMode.startsWith('authorized') ? 'success' : (deviceMode === 'unauthorized' ? 'error' : 'system'), 
        text: `[STATUS: ${badge.text}] ${badge.model}` },
      { id: 'b11', type: 'output', text: '' },
      { id: 'b12', type: 'output', text: 'MAIN MENU:' },
      { id: 'b13', type: 'output', text: '  [1] Check Connection & ADB Authorization Status' },
      { id: 'b14', type: 'output', text: '  [2] Inspect Device Hardware & OS (Model, Android Version, Manufacturer, Serial)' },
      { id: 'b15', type: 'output', text: '  [3] Inspect Battery Metrics (Level, Status, Health, Temp, Voltage)' },
      { id: 'b16', type: 'output', text: '  [4] Inspect Storage Capacity (Total, Used, Free)' },
      { id: 'b17', type: 'output', text: '  [5] Browse Files in Shared Storage (/sdcard/Download, etc.)' },
      { id: 'b18', type: 'output', text: '  [6] Copy File: Linux Computer -> Android Phone (adb push)' },
      { id: 'b19', type: 'output', text: '  [7] Copy File: Android Phone -> Linux Computer (adb pull)' },
      { id: 'b20', type: 'output', text: '  [8] Troubleshooting & Kali Linux Setup Guide' },
      { id: 'b21', type: 'output', text: '  [9] Exit AndroidBridge' },
      { id: 'b22', type: 'output', text: '' },
    ];
    setLines(bannerLines);
    setSubPrompt(null);
  };

  useEffect(() => {
    initBanner();
  }, [deviceMode]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = (text: string, type: HistoryLine['type'] = 'output') => {
    setLines(prev => [...prev, { id: Math.random().toString(36).substring(7), type, text }]);
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    addLine(`androidbridge > ${trimmed}`, 'input');

    if (subPrompt) {
      handleSubPrompt(trimmed);
      return;
    }

    switch (trimmed) {
      case '1':
        execCheckConnection();
        break;
      case '2':
        execInspectDevice();
        break;
      case '3':
        execInspectBattery();
        break;
      case '4':
        execInspectStorage();
        break;
      case '5':
        execBrowseFilesPrompt();
        break;
      case '6':
        execPushFilePrompt();
        break;
      case '7':
        execPullFilePrompt();
        break;
      case '8':
        execTroubleshooting();
        break;
      case '9':
      case 'q':
      case 'exit':
        addLine('Thank you for using AndroidBridge. Disconnecting session.\n', 'success');
        break;
      case 'clear':
        setLines([]);
        break;
      case 'help':
        addLine('Enter option 1-9 to select a menu action, or "clear" to empty terminal screen.');
        break;
      default:
        addLine(`Invalid option '${trimmed}'. Please select a number between 1 and 9.`, 'error');
        break;
    }
  };

  const handleSubPrompt = (input: string) => {
    if (!subPrompt) return;

    if (subPrompt.step === 'browse_folder') {
      const presets: Record<string, string> = {
        '1': '/sdcard/Download',
        '2': '/sdcard/DCIM',
        '3': '/sdcard/Documents',
        '4': '/sdcard/Pictures',
        '5': '/sdcard/Music',
        '6': '/sdcard/Movies',
        '7': '/sdcard',
      };

      if (input === '0') {
        addLine('Returned to main menu.');
        setSubPrompt(null);
        return;
      }

      const folder = presets[input] || input;
      execListDirectory(folder);
      setSubPrompt(null);
    } else if (subPrompt.step === 'push_file') {
      if (!input) {
        addLine('Cancelled.');
        setSubPrompt(null);
        return;
      }
      setSubPrompt({ step: 'push_dest', data: { file: input } });
      addLine(`Source selected: ${input}`);
      addLine('Select destination folder:');
      addLine('  [1] /sdcard/Download/ (Default)');
      addLine('  [2] /sdcard/Documents/');
      addLine('  [3] /sdcard/Pictures/');
      addLine('Enter choice [1-3, default 1]:');
    } else if (subPrompt.step === 'push_dest') {
      const destMap: Record<string, string> = {
        '1': '/sdcard/Download/',
        '2': '/sdcard/Documents/',
        '3': '/sdcard/Pictures/',
      };
      const dest = destMap[input] || '/sdcard/Download/';
      const src = subPrompt.data?.file || 'file.txt';
      addLine(`Executing: adb push "${src}" "${dest}" ...`, 'system');
      setTimeout(() => {
        addLine(`[✓] SUCCESS! File copied to phone: ${dest}${src.split('/').pop() || 'file.txt'}`, 'success');
        addLine(`    Bytes transferred: 1,482,900 bytes (1.41 MB) in 0.18s [7.8 MB/s]`, 'output');
        setSubPrompt(null);
      }, 300);
    } else if (subPrompt.step === 'pull_file') {
      if (!input) {
        addLine('Cancelled.');
        setSubPrompt(null);
        return;
      }
      setSubPrompt({ step: 'pull_dest', data: { file: input } });
      addLine(`Phone path: ${input}`);
      addLine('Enter local destination on Linux [default: ~/Downloads]:');
    } else if (subPrompt.step === 'pull_dest') {
      const localDest = input || '~/Downloads';
      const remote = subPrompt.data?.file || '/sdcard/Download/sample.pdf';
      const filename = remote.split('/').pop() || 'sample.pdf';
      addLine(`Executing: adb pull "${remote}" "${localDest}/${filename}" ...`, 'system');
      setTimeout(() => {
        addLine(`[✓] SUCCESS! File saved to Linux: ${localDest}/${filename}`, 'success');
        addLine(`    Bytes transferred: 3,892,104 bytes (3.71 MB) in 0.32s [11.6 MB/s]`, 'output');
        setSubPrompt(null);
      }, 300);
    } else if (subPrompt.step === 'restart_adb') {
      if (input.toLowerCase() === 'y') {
        addLine('Restarting ADB server (adb kill-server && adb start-server)...', 'system');
        setTimeout(() => {
          addLine('[✓] ADB server daemon restarted on port 5037.', 'success');
          setSubPrompt(null);
        }, 400);
      } else {
        addLine('Skipped restart.');
        setSubPrompt(null);
      }
    }
  };

  const checkReady = (): boolean => {
    if (deviceMode === 'adb_missing') {
      addLine('[!] ERROR: ADB binary not found on this system.', 'error');
      addLine('    How to install on Kali Linux: sudo apt update && sudo apt install -y adb', 'system');
      return false;
    }
    if (deviceMode === 'no_device') {
      addLine('[!] ERROR: No connected Android device detected over USB.', 'error');
      addLine('    Check: 1) USB cable connected? 2) USB Debugging enabled in Developer Options?', 'system');
      return false;
    }
    if (deviceMode === 'unauthorized') {
      addLine('[!] ERROR: Connected device is UNAUTHORIZED.', 'error');
      addLine('    ACTION REQUIRED ON PHONE SCREEN: Unlock phone and tap "Allow" on the USB Debugging prompt.', 'error');
      return false;
    }
    return true;
  };

  const execCheckConnection = () => {
    addLine('\n--- [1] Checking Connection & ADB Status ---', 'system');
    if (deviceMode === 'adb_missing') {
      addLine('[!] ADB binary not found on this Linux system.', 'error');
      addLine('\nHow to fix on Kali Linux / Debian / Ubuntu:', 'output');
      addLine('  1. Open a terminal and run: sudo apt update && sudo apt install -y adb', 'output');
      addLine('  2. Start ADB server: adb start-server', 'output');
      return;
    }

    addLine('[✓] ADB is installed: Android Debug Bridge version 1.0.41 (34.0.5)', 'success');
    if (deviceMode === 'no_device') {
      addLine('\n[!] No connected Android devices detected.', 'error');
      addLine('Troubleshooting checklist:');
      addLine('  1. Connect phone with USB data cable.');
      addLine('  2. Enable Settings -> About Phone -> Tap "Build Number" 7 times.');
      addLine('  3. In Developer Options: Toggle ON "USB Debugging".');
      addLine('  4. Set USB mode to "File Transfer (MTP)".');
      return;
    }

    if (deviceMode === 'unauthorized') {
      addLine('Found 1 device(s):');
      addLine('  1. Serial: 28241FDH200389 | State: [UNAUTHORIZED - RSA KEY APPROVAL PENDING]', 'error');
      addLine('\nACTION REQUIRED ON PHONE:');
      addLine('  1. Unlock your phone screen.');
      addLine('  2. Popup will appear: "Allow USB debugging? The computer\'s RSA key fingerprint is..."');
      addLine('  3. Check "Always allow from this computer" and tap "Allow".');
      return;
    }

    const serial = deviceMode === 'authorized_pixel' ? '28241FDH200389' : 'R5CR907X2YA';
    const model = deviceMode === 'authorized_pixel' ? 'Pixel 8' : 'Galaxy S24';
    addLine('Found 1 device(s):');
    addLine(`  1. Serial: ${serial} | Model: ${model} | State: [READY & AUTHORIZED]`, 'success');
  };

  const execInspectDevice = () => {
    addLine('\n--- [2] Inspecting Device Hardware & OS ---', 'system');
    if (!checkReady()) return;

    if (deviceMode === 'authorized_pixel') {
      addLine('DEVICE HARDWARE & IDENTITY:');
      addLine('-------------------------------------------------------');
      addLine('  Manufacturer      : Google');
      addLine('  Model             : Pixel 8 (Google Pixel 8 Pro Series)');
      addLine('  Android Version   : 14 (API Level 34 - UpsideDownCake)');
      addLine('  Serial Number     : 28241FDH200389');
      addLine('  CPU Architecture  : arm64-v8a');
      addLine('  Build Fingerprint : google/husky/husky:14/UD1A.231105.004/11010474');
      addLine('-------------------------------------------------------');
    } else {
      addLine('DEVICE HARDWARE & IDENTITY:');
      addLine('-------------------------------------------------------');
      addLine('  Manufacturer      : Samsung');
      addLine('  Model             : SM-S921B (Galaxy S24)');
      addLine('  Android Version   : 14 (API Level 34 - One UI 6.1)');
      addLine('  Serial Number     : R5CR907X2YA');
      addLine('  CPU Architecture  : arm64-v8a');
      addLine('  Build Fingerprint : samsung/e1sxxx/e1s:14/UP1A.231005.007/S921BXXU1AXB5');
      addLine('-------------------------------------------------------');
    }
  };

  const execInspectBattery = () => {
    addLine('\n--- [3] Inspecting Battery Level & Health ---', 'system');
    if (!checkReady()) return;

    addLine('BATTERY DIAGNOSTICS (dumpsys battery):');
    addLine('-------------------------------------------------------');
    addLine('  Battery Level     : 82% [████████████████░░░░]');
    addLine('  Charging Status   : Charging');
    addLine('  Power Source      : USB Cable (PC Host - 500mA)');
    addLine('  Battery Health    : Good (Normal)');
    addLine('  Temperature       : 28.4°C / 83.1°F');
    addLine('  Voltage           : 4.120 V (4120 mV)');
    addLine('-------------------------------------------------------');
  };

  const execInspectStorage = () => {
    addLine('\n--- [4] Inspecting Storage Capacity ---', 'system');
    if (!checkReady()) return;

    addLine('STORAGE CAPACITY (Shared Internal Storage /sdcard):');
    addLine('-------------------------------------------------------');
    addLine('  Mount Point       : /storage/emulated/0 (/sdcard)');
    addLine('  Filesystem        : /dev/fuse');
    addLine('  Total Capacity    : 128.0 GB');
    addLine('  Used Space        : 68.4 GB');
    addLine('  Available Space   : 59.6 GB');
    addLine('  Usage Percentage  : 53% [██████████░░░░░░░░░░]');
    addLine('-------------------------------------------------------');
  };

  const execBrowseFilesPrompt = () => {
    addLine('\n--- [5] Browse Files in Shared Storage ---', 'system');
    if (!checkReady()) return;

    addLine('Select folder to browse:');
    addLine('  [1] /sdcard/Download - Browser downloads & documents');
    addLine('  [2] /sdcard/DCIM - Camera photos & video');
    addLine('  [3] /sdcard/Documents - User documents');
    addLine('  [4] /sdcard/Pictures - Screenshots & images');
    addLine('  [5] /sdcard/Music - Audio files');
    addLine('  [6] /sdcard/Movies - Video recordings');
    addLine('  [7] /sdcard - Root of shared storage');
    addLine('  [0] Cancel & back');
    addLine('Enter choice [0-7]:');
    setSubPrompt({ step: 'browse_folder' });
  };

  const execListDirectory = (path: string) => {
    addLine(`\nListing contents of "${path}" via adb shell ls -la:`, 'system');
    addLine('TYPE   SIZE         DATE               NAME');
    addLine('-----------------------------------------------------------------');
    if (path.includes('Download')) {
      addLine('DIR    4.0 KB       2026-10-04 14:22   Telegram/');
      addLine('DIR    4.0 KB       2026-10-06 09:15   PDF_Invoices/');
      addLine('FILE   1.4 MB       2026-10-07 18:30   kali_cheatsheet.pdf');
      addLine('FILE   450.2 KB     2026-10-08 10:12   network_capture.pcap');
      addLine('FILE   12.8 KB      2026-10-08 11:05   notes.txt');
    } else if (path.includes('DCIM')) {
      addLine('DIR    4.0 KB       2026-10-01 12:00   Camera/');
      addLine('DIR    4.0 KB       2026-10-05 16:40   Screenshots/');
      addLine('FILE   3.8 MB       2026-10-07 19:22   IMG_20261007_192201.jpg');
      addLine('FILE   4.1 MB       2026-10-08 08:44   IMG_20261008_084412.jpg');
    } else {
      addLine('DIR    4.0 KB       2026-10-01 00:00   Android/');
      addLine('DIR    4.0 KB       2026-10-08 10:00   Download/');
      addLine('DIR    4.0 KB       2026-10-08 09:00   DCIM/');
      addLine('DIR    4.0 KB       2026-10-07 14:00   Documents/');
      addLine('DIR    4.0 KB       2026-10-06 18:00   Pictures/');
    }
    addLine('-----------------------------------------------------------------');
  };

  const execPushFilePrompt = () => {
    addLine('\n--- [6] Copy File: Linux Computer -> Android Phone (adb push) ---', 'system');
    if (!checkReady()) return;

    addLine('Enter local file path on Linux (e.g., ./report.pdf or ~/firmware.bin):');
    setSubPrompt({ step: 'push_file' });
  };

  const execPullFilePrompt = () => {
    addLine('\n--- [7] Copy File: Android Phone -> Linux Computer (adb pull) ---', 'system');
    if (!checkReady()) return;

    addLine('Enter full path on phone (e.g., /sdcard/Download/kali_cheatsheet.pdf):');
    setSubPrompt({ step: 'pull_file' });
  };

  const execTroubleshooting = () => {
    addLine('\n--- [8] Troubleshooting & Kali Linux Setup Guide ---', 'system');
    addLine('1. KALI LINUX ADB INSTALLATION:');
    addLine('   sudo apt update && sudo apt install -y adb python3');
    addLine('\n2. UDEV PERMISSION CONFIGURATION (/etc/udev/rules.d/51-android.rules):');
    addLine('   SUBSYSTEM=="usb", ATTR{idVendor}!="", MODE="0666", GROUP="plugdev"');
    addLine('\n3. RESOLVING "UNAUTHORIZED" STATE:');
    addLine('   - Unlock phone screen.');
    addLine('   - Check "Always allow from this computer" and tap "Allow".');
    addLine('\nWould you like to restart the ADB daemon now? [y/N]:');
    setSubPrompt({ step: 'restart_adb' });
  };

  const copyKaliRunCmd = () => {
    navigator.clipboard.writeText('sudo apt update && sudo apt install -y adb python3 && python3 main.py');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Terminal View */}
      <div className="flex-1 bg-neutral-950 rounded-xl border border-neutral-800 shadow-2xl flex flex-col overflow-hidden h-[640px]">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-mono text-neutral-400">kali@kali: ~/androidbridge (python3 main.py)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLines([]);
                initBanner();
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
              title="Reset terminal session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Output Area */}
        <div 
          className="flex-1 p-4 font-mono text-xs overflow-y-auto leading-relaxed select-text space-y-1"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l) => {
            let color = 'text-neutral-300';
            if (l.type === 'input') color = 'text-emerald-400 font-semibold';
            if (l.type === 'system') color = 'text-cyan-400';
            if (l.type === 'error') color = 'text-rose-400';
            if (l.type === 'success') color = 'text-emerald-300 font-medium';
            return (
              <div key={l.id} className={`${color} whitespace-pre-wrap`}>
                {l.text}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800 flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
            {subPrompt ? 'input >' : 'androidbridge >'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputVal.trim()) {
                handleCommand(inputVal);
                setInputVal('');
              }
            }}
            placeholder={subPrompt ? "Type response and press Enter..." : "Type 1-9 or click buttons below..."}
            className="flex-1 bg-transparent border-none text-white font-mono text-xs focus:outline-none placeholder-neutral-600"
            autoFocus
          />
          <button
            onClick={() => {
              if (inputVal.trim()) {
                handleCommand(inputVal);
                setInputVal('');
              }
            }}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded transition-colors"
          >
            Send
          </button>
        </div>

        {/* Quick Menu Action Buttons */}
        <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-900 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-mono text-neutral-500 mr-1">Quick Select:</span>
          {[
            { key: '1', label: '1: Status' },
            { key: '2', label: '2: Device' },
            { key: '3', label: '3: Battery' },
            { key: '4', label: '4: Storage' },
            { key: '5', label: '5: Browse' },
            { key: '6', label: '6: Push' },
            { key: '7', label: '7: Pull' },
            { key: '8', label: '8: Help' },
            { key: 'clear', label: 'Clear' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleCommand(item.key)}
              className="px-2 py-0.5 text-[11px] font-mono bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Control & Device State Switcher */}
      <div className="w-full xl:w-80 flex flex-col gap-4">
        {/* Device State Card */}
        <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Simulate Device States</h3>
          </div>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Switch simulated hardware environments to test how AndroidBridge handles ADB presence, phone authorization popups, and device detection.
          </p>

          <div className="space-y-2">
            {[
              { id: 'authorized_pixel', label: 'Pixel 8 (Authorized)', icon: CheckCircle2, sub: 'Android 14 · Ready' },
              { id: 'authorized_samsung', label: 'Galaxy S24 (Authorized)', icon: CheckCircle2, sub: 'Android 14 · Ready' },
              { id: 'unauthorized', label: 'Unauthorized Prompt Pending', icon: ShieldAlert, sub: 'RSA screen authorization needed' },
              { id: 'no_device', label: 'No Device Plugged In', icon: WifiOff, sub: 'Simulate disconnected USB' },
              { id: 'adb_missing', label: 'ADB Not Installed on Kali', icon: Terminal, sub: 'Simulate missing apt package' },
            ].map((state) => {
              const Icon = state.icon;
              const isActive = deviceMode === state.id;
              return (
                <button
                  key={state.id}
                  onClick={() => setDeviceMode(state.id as DeviceStateMode)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-start gap-2.5 ${
                    isActive 
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-white' 
                      : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                  <div>
                    <div className="font-medium">{state.label}</div>
                    <div className="text-[11px] text-neutral-500">{state.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fast Run Command Card */}
        <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-5">
          <h4 className="text-xs font-semibold text-white mb-2">Run in Real Kali Linux Terminal</h4>
          <p className="text-xs text-neutral-400 mb-3">
            Copy the 1-liner to install prerequisites and run AndroidBridge on your Kali machine:
          </p>
          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-2 font-mono text-[11px] text-emerald-400">
            <span className="truncate">sudo apt update && sudo apt install -y adb python3 && python3 main.py</span>
            <button
              onClick={copyKaliRunCmd}
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors shrink-0"
              title="Copy command"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
