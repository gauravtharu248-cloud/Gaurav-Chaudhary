import React, { useState } from 'react';
import { 
  Terminal, 
  Smartphone, 
  ShieldCheck, 
  Check, 
  Copy, 
  AlertCircle,
  HelpCircle,
  Cpu,
  Lock
} from 'lucide-react';

interface CommandBoxProps {
  command: string;
  label?: string;
}

function CommandBox({ command, label }: CommandBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 my-2 font-mono text-xs flex items-center justify-between gap-3 group">
      <div className="overflow-x-auto text-emerald-400">
        {label && <span className="text-neutral-500 mr-2 select-none"># {label}</span>}
        <span>{command}</span>
      </div>
      <button
        onClick={handleCopy}
        className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors shrink-0"
        title="Copy command"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function KaliInstallGuide() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Overview Card */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Kali Linux Installation & Exact Run Commands</h2>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Follow these instructions to set up AndroidBridge on Kali Linux (or any Debian/Ubuntu-based distribution).
          AndroidBridge uses the Python 3 standard library, requiring no pip packages or virtual environment hassles.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-neutral-950/70 border border-neutral-800/80 rounded-lg">
            <div className="text-cyan-400 font-mono text-xs font-semibold mb-1">Step 1</div>
            <div className="text-sm font-medium text-white mb-1">Install ADB & Python</div>
            <p className="text-xs text-neutral-400">Install the official Debian/Kali Android Debug Bridge binary via apt.</p>
          </div>

          <div className="p-4 bg-neutral-950/70 border border-neutral-800/80 rounded-lg">
            <div className="text-cyan-400 font-mono text-xs font-semibold mb-1">Step 2</div>
            <div className="text-sm font-medium text-white mb-1">Authorize USB Debugging</div>
            <p className="text-xs text-neutral-400">Unlock your phone and approve the RSA encryption key prompt.</p>
          </div>

          <div className="p-4 bg-neutral-950/70 border border-neutral-800/80 rounded-lg">
            <div className="text-cyan-400 font-mono text-xs font-semibold mb-1">Step 3</div>
            <div className="text-sm font-medium text-white mb-1">Run AndroidBridge</div>
            <p className="text-xs text-neutral-400">Launch the interactive menu with python3 main.py.</p>
          </div>
        </div>
      </div>

      {/* Method 1: Automated Script */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Method 1: Automated Kali Setup Script (Recommended)</h3>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          AndroidBridge includes a ready-to-run bash script that automatically checks dependencies, configures Android udev rules, and starts the ADB daemon:
        </p>

        <CommandBox label="Make script executable and run" command="chmod +x setup_kali.sh && ./setup_kali.sh" />
        <CommandBox label="Launch AndroidBridge immediately" command="python3 main.py" />
      </div>

      {/* Method 2: Manual Commands */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Method 2: Manual Step-by-Step Commands</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <span className="font-semibold text-neutral-200">1. Update package list and install ADB:</span>
            <CommandBox command="sudo apt update && sudo apt install -y adb python3" />
          </div>

          <div>
            <span className="font-semibold text-neutral-200">2. Verify ADB installation:</span>
            <CommandBox command="adb version" />
          </div>

          <div>
            <span className="font-semibold text-neutral-200">3. (Optional) Configure Android udev rules for non-root Kali access:</span>
            <p className="text-neutral-400 mt-1 mb-2">
              Prevents the "no permissions" error when connecting USB devices as a regular user:
            </p>
            <CommandBox command={'sudo bash -c "echo \\"SUBSYSTEM==\\\\\\"usb\\\\\\", ATTR{idVendor}!=\\\\\\"\\\\\\", MODE=\\\\\\"0666\\\\\\", GROUP=\\\\\\"plugdev\\\\\\"\\" > /etc/udev/rules.d/51-android.rules"'} />
            <CommandBox command="sudo udevadm control --reload-rules && sudo udevadm trigger" />
          </div>

          <div>
            <span className="font-semibold text-neutral-200">4. Start the ADB daemon:</span>
            <CommandBox command="adb start-server" />
          </div>

          <div>
            <span className="font-semibold text-neutral-200">5. Execute AndroidBridge:</span>
            <CommandBox command="python3 main.py" />
          </div>
        </div>
      </div>

      {/* Phone Preparation Checklist */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Configuring Your Android Phone</h3>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Because Android security enforces hardware encryption and strict authorization, follow these steps on your phone:
        </p>

        <div className="space-y-3 text-xs text-neutral-300">
          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800 flex gap-3">
            <span className="font-mono text-cyan-400 font-bold">1</span>
            <div>
              <strong className="text-white">Enable Developer Options:</strong> Open <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">Settings</code> → <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">About Phone</code> → Tap <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">Build Number</code> 7 times rapidly until "You are now a developer" appears.
            </div>
          </div>

          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800 flex gap-3">
            <span className="font-mono text-cyan-400 font-bold">2</span>
            <div>
              <strong className="text-white">Enable USB Debugging:</strong> Open <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">Settings</code> → <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">Developer Options</code> → Toggle ON <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">USB Debugging</code>.
            </div>
          </div>

          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800 flex gap-3">
            <span className="font-mono text-cyan-400 font-bold">3</span>
            <div>
              <strong className="text-white">Connect USB Cable:</strong> Connect your phone to your Kali Linux PC. Pull down notifications and select USB mode <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">File Transfer (MTP)</code>.
            </div>
          </div>

          <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800 flex gap-3">
            <span className="font-mono text-cyan-400 font-bold">4</span>
            <div>
              <strong className="text-white">Authorize RSA Fingerprint Dialog:</strong> When the phone prompts <em className="text-neutral-200">"Allow USB debugging? The computer's RSA key fingerprint is..."</em>, check <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200">Always allow from this computer</code> and tap <strong className="text-emerald-400">Allow</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Security & Ethical Boundaries */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Security & Ethical Compliance</h3>
        </div>
        <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
          AndroidBridge is built in accordance with strict security and privacy standards:
        </p>

        <ul className="space-y-2 text-xs text-neutral-300 list-disc list-inside">
          <li><strong>Never Bypasses Locks:</strong> Cannot bypass pattern, PIN, password, biometric authentication, or screen locks.</li>
          <li><strong>User-Authorized ADB Protocol:</strong> Requires legitimate ADB RSA public/private key pairing explicitly approved by the phone owner.</li>
          <li><strong>Zero Exploit / Zero Spyware:</strong> Uses standard Android debugging commands (<code className="font-mono text-cyan-300">getprop</code>, <code className="font-mono text-cyan-300">dumpsys battery</code>, <code className="font-mono text-cyan-300">df</code>, <code className="font-mono text-cyan-300">adb push/pull</code>). Contains no hidden persistence, backdoors, or root-kits.</li>
          <li><strong>Shared Storage Sandbox:</strong> File management is strictly constrained to user-accessible shared folders (<code className="font-mono text-cyan-300">/sdcard/</code>). System roots and private app sandbox databases are protected.</li>
        </ul>
      </div>
    </div>
  );
}
