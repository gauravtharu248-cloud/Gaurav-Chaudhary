/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Terminal, 
  FileCode, 
  Download, 
  HelpCircle, 
  ArrowLeftRight, 
  ShieldCheck,
  Check,
  Copy
} from 'lucide-react';
import { TerminalSimulator } from './components/TerminalSimulator';
import { SourceCodeExplorer } from './components/SourceCodeExplorer';
import { KaliInstallGuide } from './components/KaliInstallGuide';
import { FileTransferLab } from './components/FileTransferLab';
import { downloadProjectZip } from './utils/zipExport';

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'code' | 'kali' | 'transfer'>('terminal');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);

  const handleDownloadAll = async () => {
    try {
      setIsExporting(true);
      await downloadProjectZip();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyOneLiner = () => {
    navigator.clipboard.writeText('sudo apt update && sudo apt install -y adb python3 && python3 main.py');
    setCopiedQuick(true);
    setTimeout(() => setCopiedQuick(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col selection:bg-cyan-900 selection:text-white">
      {/* Top Bar Contract: 3 zones */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Wordmark */}
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('terminal'); }} className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>AndroidBridge</span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`hover:text-white transition-colors cursor-pointer ${activeTab === 'terminal' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Terminal CLI
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`hover:text-white transition-colors cursor-pointer ${activeTab === 'code' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Source Code
            </button>
            <button
              onClick={() => setActiveTab('kali')}
              className={`hover:text-white transition-colors cursor-pointer ${activeTab === 'kali' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Kali Guide
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`hover:text-white transition-colors cursor-pointer ${activeTab === 'transfer' ? 'text-cyan-400 font-semibold' : ''}`}
            >
              Transfer Lab
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadAll}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Packaging...' : 'Download .zip'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Meta Context */}
      <div className="border-b border-neutral-900 bg-neutral-950/40 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Beginner-Friendly Android CLI for Kali Linux
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
              <span>Python 3 Standard Library</span>
              <span aria-hidden="true">·</span>
              <span>Android Debug Bridge (ADB)</span>
              <span aria-hidden="true">·</span>
              <span>Zero Exploits / Explicit USB Debugging</span>
              <span aria-hidden="true">·</span>
              <span>Kali Linux & Debian Ready</span>
            </div>
          </div>

          {/* Fast copy pill */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-300">
            <span className="text-emerald-400 truncate max-w-xs">python3 main.py</span>
            <button
              onClick={handleCopyOneLiner}
              className="text-neutral-400 hover:text-white transition-colors p-1"
              title="Copy Kali command"
            >
              {copiedQuick ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'terminal' && <TerminalSimulator />}
        {activeTab === 'code' && <SourceCodeExplorer />}
        {activeTab === 'kali' && <KaliInstallGuide />}
        {activeTab === 'transfer' && <FileTransferLab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-6 mt-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>AndroidBridge · Compliant with Android USB Debugging Security Protocols</span>
          </div>
          <div>
            <span>Apache 2.0 License · Designed for User-Owned Devices</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
