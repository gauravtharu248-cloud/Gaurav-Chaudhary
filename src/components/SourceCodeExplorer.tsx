import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Folder, 
  FileText, 
  Terminal,
  ExternalLink
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from '../data/projectFiles';
import { downloadProjectZip } from '../utils/zipExport';

export function SourceCodeExplorer() {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloading(true);
      await downloadProjectZip();
    } finally {
      setIsDownloading(false);
    }
  };

  const lineCount = selectedFile.content.split('\n').length;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* File Tree Sidebar */}
      <div className="w-full lg:w-72 bg-neutral-900/90 rounded-xl border border-neutral-800 p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white tracking-wide">Project Structure</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">{PROJECT_FILES.length} files</span>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[540px]">
          {/* Main entry */}
          <div className="text-[11px] font-mono text-neutral-500 px-2 py-1 uppercase tracking-wider">Root</div>
          {PROJECT_FILES.filter(f => !f.path.includes('/')).map(file => {
            const isSelected = selectedFile.path === file.path;
            const Icon = file.name.endsWith('.sh') ? Terminal : (file.name.endsWith('.md') ? FileText : FileCode);
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                  isSelected 
                    ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/40' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-neutral-500'}`} />
                <span className="truncate">{file.name}</span>
              </button>
            );
          })}

          {/* AndroidBridge package */}
          <div className="text-[11px] font-mono text-neutral-500 px-2 py-1 mt-3 uppercase tracking-wider">androidbridge/</div>
          {PROJECT_FILES.filter(f => f.path.includes('/')).map(file => {
            const isSelected = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                  isSelected 
                    ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/40' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-neutral-500'}`} />
                <span className="truncate">{file.name}</span>
              </button>
            );
          })}
        </div>

        {/* Download Full Zip Button */}
        <div className="mt-4 pt-3 border-t border-neutral-800">
          <button
            onClick={handleDownloadAll}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Archiving...' : 'Download Project (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden flex flex-col h-[640px]">
        {/* File Header */}
        <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-white">{selectedFile.path}</span>
                <span className="text-[11px] text-neutral-500 font-mono">({lineCount} lines · {selectedFile.language})</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">{selectedFile.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownloadSingle}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded transition-colors"
              title="Download single file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Code Content with Line Numbers */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed flex">
          {/* Line Numbers */}
          <div className="select-none text-neutral-600 text-right pr-4 border-r border-neutral-800 shrink-0 font-mono">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i + 1} className="h-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Text */}
          <pre className="pl-4 text-neutral-300 font-mono whitespace-pre flex-1 overflow-x-auto selection:bg-cyan-900 selection:text-white">
            {selectedFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
}
