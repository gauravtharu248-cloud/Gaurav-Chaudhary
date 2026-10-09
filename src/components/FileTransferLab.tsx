import React, { useState } from 'react';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Folder, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileCheck
} from 'lucide-react';

export function FileTransferLab() {
  const [activeTab, setActiveTab] = useState<'push' | 'pull'>('push');
  const [pushLocalPath, setPushLocalPath] = useState('~/Documents/linux_project.tar.gz');
  const [pushDestPath, setPushDestPath] = useState('/sdcard/Download/');
  const [pushResult, setPushResult] = useState<string | null>(null);

  const [pullDevicePath, setPullDevicePath] = useState('/sdcard/DCIM/Camera/photo.jpg');
  const [pullDestPath, setPullDestPath] = useState('~/Downloads');
  const [pullResult, setPullResult] = useState<string | null>(null);

  const simulatePush = () => {
    // Path sanitization check
    if (pushDestPath.includes('..') || (!pushDestPath.startsWith('/sdcard') && !pushDestPath.startsWith('/storage/emulated/0'))) {
      setPushResult('BLOCKED: Path traversal attempt detected! AndroidBridge only allows transfers into user shared storage (/sdcard/).');
      return;
    }
    const filename = pushLocalPath.split('/').pop() || 'file';
    setPushResult(`SUCCESS: "adb push ${pushLocalPath} ${pushDestPath}" -> Copied ${filename} (2.4 MB) at 14.8 MB/s into ${pushDestPath}`);
  };

  const simulatePull = () => {
    if (pullDevicePath.includes('..') || (!pullDevicePath.startsWith('/sdcard') && !pullDevicePath.startsWith('/storage/emulated/0'))) {
      setPullResult('BLOCKED: Security rule violation! Cannot pull files outside user shared storage.');
      return;
    }
    const filename = pullDevicePath.split('/').pop() || 'file';
    setPullResult(`SUCCESS: "adb pull ${pullDevicePath} ${pullDestPath}" -> Pulled ${filename} (3.8 MB) at 18.2 MB/s into ${pullDestPath}/${filename}`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-neutral-900/80 rounded-xl border border-neutral-800 p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Authorized File Transfer Diagnostics</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Simulate how AndroidBridge validates paths, tests destination folders, and invokes <code className="font-mono text-cyan-300">adb push</code> and <code className="font-mono text-cyan-300">adb pull</code>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('push')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'push' 
              ? 'border-cyan-400 text-cyan-400 font-semibold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Copy Linux → Phone (Push)</span>
        </button>
        <button
          onClick={() => setActiveTab('pull')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'pull' 
              ? 'border-cyan-400 text-cyan-400 font-semibold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span>Copy Phone → Linux (Pull)</span>
        </button>
      </div>

      {activeTab === 'push' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Source file on Linux:</label>
            <input
              type="text"
              value={pushLocalPath}
              onChange={(e) => setPushLocalPath(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Target folder on Android phone:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pushDestPath}
                onChange={(e) => setPushDestPath(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => setPushDestPath('/sdcard/Download/')}
                className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-mono"
              >
                Download
              </button>
              <button
                onClick={() => setPushDestPath('/sdcard/Documents/')}
                className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-mono"
              >
                Documents
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={simulatePush}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Test adb push validation
            </button>
          </div>

          {pushResult && (
            <div className={`p-3 rounded-lg border text-xs font-mono ${
              pushResult.startsWith('SUCCESS') 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              {pushResult}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">File path on Android phone (/sdcard/...):</label>
            <input
              type="text"
              value={pullDevicePath}
              onChange={(e) => setPullDevicePath(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Destination directory on Linux computer:</label>
            <input
              type="text"
              value={pullDestPath}
              onChange={(e) => setPullDestPath(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={simulatePull}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Test adb pull validation
            </button>
          </div>

          {pullResult && (
            <div className={`p-3 rounded-lg border text-xs font-mono ${
              pullResult.startsWith('SUCCESS') 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              {pullResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
