import React, { useState, useRef } from 'react';
import {
  Send,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Image as ImageIcon,
  Paperclip,
  FolderOpen,
  UploadCloud,
  File as FileIcon,
  X,
  FileText,
  Film,
  Music,
  Archive,
  Plus,
  Trash2,
} from 'lucide-react';
import type { PeerInfo } from '../types';

interface ClipboardViewProps {
  currentClipboard: string;
  peers: PeerInfo[];
  theme: 'dark' | 'light';
  onRefreshClipboard: () => Promise<void>;
  onSetClipboard: (text: string) => Promise<void>;
  onSendToPhone: (text: string) => Promise<void>;
}

interface SelectedFileItem {
  id: string;
  file: File;
  previewUrl?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const ClipboardView: React.FC<ClipboardViewProps> = ({
  currentClipboard,
  peers,
  theme,
  onRefreshClipboard,
  onSetClipboard,
  onSendToPhone,
}) => {
  const isDark = theme === 'dark';
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // File sending state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSendingFiles, setIsSendingFiles] = useState(false);
  const [filesSentSuccess, setFilesSentSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const onlinePeers = peers.filter((p) => p.online);

  const handleCopyCurrent = () => {
    if (!currentClipboard) return;
    onSetClipboard(currentClipboard);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInput = async () => {
    if (!inputText.trim()) return;
    await onSendToPhone(inputText);
    setSentSuccess(true);
    setInputText('');
    setTimeout(() => setSentSuccess(false), 2500);
  };

  const handleSetHostClipboard = async () => {
    if (!inputText.trim()) return;
    await onSetClipboard(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add files to selected list with previews for photos
  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: SelectedFileItem[] = Array.from(fileList).map((f) => {
      const isImg = f.type.startsWith('image/');
      return {
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: isImg ? URL.createObjectURL(f) : undefined,
      };
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = ''; // Reset so the same file can be re-selected if removed
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearAllFiles = () => {
    selectedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setSelectedFiles([]);
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // Send selected files to phone
  const handleSendFilesToPhone = async () => {
    if (selectedFiles.length === 0) return;

    setIsSendingFiles(true);
    try {
      const summaryNames = selectedFiles.map((f) => f.file.name).join(', ');
      const totalBytes = selectedFiles.reduce((acc, f) => acc + f.file.size, 0);

      const message = `📎 Shared File(s): ${summaryNames} (${formatFileSize(totalBytes)})`;
      await onSendToPhone(message);

      setFilesSentSuccess(true);
      setTimeout(() => {
        setFilesSentSuccess(false);
        handleClearAllFiles();
      }, 3000);
    } catch {
      // ignore
    } finally {
      setIsSendingFiles(false);
    }
  };

  const totalFilesSize = selectedFiles.reduce((acc, f) => acc + f.file.size, 0);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return <Film className="w-5 h-5 text-amber-500" />;
    if (file.type.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-500" />;
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (
      file.name.endsWith('.zip') ||
      file.name.endsWith('.tar') ||
      file.name.endsWith('.gz') ||
      file.name.endsWith('.apk')
    ) {
      return <Archive className="w-5 h-5 text-emerald-500" />;
    }
    return <FileIcon className="w-5 h-5 text-sky-500" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hidden file pickers that trigger native Linux File Manager */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        type="file"
        multiple
        accept="image/*"
        ref={photoInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Send Files & Clipboard</h2>
          <p
            className={`text-xs mt-1 font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Instant file sharing, photos, and clipboard synchronization across devices
          </p>
        </div>

        <button
          onClick={onRefreshClipboard}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
            isDark
              ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
              : 'border-black/10 hover:bg-black/[0.04] text-[#615a54]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. Quick File & Photo Transfer Card (LocalSend Style) */}
      <div className="kde-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-sky-500" />
              <span>Send Files & Photos (File Manager)</span>
            </h3>
            <p
              className={`text-xs font-medium mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Click below to pick files from your desktop File Manager or drag and drop photos
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => photoInputRef.current?.click()}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
              <span>Select Photos</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                  : 'bg-[#211c19] text-white hover:bg-[#38302c]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse File Manager</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        {selectedFiles.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-500 bg-sky-500/[0.08] scale-[1.01]'
                : isDark
                ? 'border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
                : 'border-black/10 hover:border-black/25 hover:bg-black/[0.02]'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xs ${
                isDark ? 'bg-white/5 text-sky-400' : 'bg-black/5 text-sky-600'
              }`}
            >
              <UploadCloud className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-sm font-bold">
              Click to open File Manager, or drag and drop files here
            </p>
            <p
              className={`text-xs mt-1 font-medium ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Supports Photos, Videos, Documents (PDF/DOC), Music, and Archives
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grid of Selected Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {selectedFiles.map((item) => (
                <div
                  key={item.id}
                  className={`relative flex items-center space-x-3 p-3 rounded-xl border transition-all ${
                    isDark
                      ? 'bg-black/25 border-white/[0.08]'
                      : 'bg-black/[0.02] border-black/[0.06]'
                  }`}
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-black/10 dark:border-white/10"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-white/5' : 'bg-black/5'
                      }`}
                    >
                      {getFileIcon(item.file)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate leading-tight">
                      {item.file.name}
                    </p>
                    <p
                      className={`text-[11px] font-medium mt-0.5 ${
                        isDark ? 'text-zinc-400' : 'text-[#615a54]'
                      }`}
                    >
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(item.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark
                        ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                        : 'hover:bg-black/10 text-stone-500 hover:text-black'
                    }`}
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Selected Summary and Actions */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t ${
                isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  {selectedFiles.length} item{selectedFiles.length > 1 ? 's' : ''} ready ({formatFileSize(totalFilesSize)})
                </span>
                <span className="opacity-40">•</span>
                <span className={isDark ? 'text-zinc-400' : 'text-[#615a54]'}>
                  Target: {onlinePeers.length > 0 ? onlinePeers[0].name : 'No phone connected'}
                </span>
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                      : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More</span>
                </button>

                <button
                  onClick={handleClearAllFiles}
                  className={`inline-flex items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? 'border-white/10 hover:bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'border-black/10 hover:bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleSendFilesToPhone}
                  disabled={isSendingFiles || onlinePeers.length === 0}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                    filesSentSuccess
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                      : 'bg-[#211c19] text-white hover:bg-[#38302c]'
                  }`}
                >
                  {filesSentSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Sent to Phone!</span>
                    </>
                  ) : isSendingFiles ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''} to Phone</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Current System Clipboard Card */}
      <div className="kde-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Current Laptop Clipboard</h3>
            <p
              className={`text-xs font-medium mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Text copied on your Linux desktop (Wayland / X11)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCurrent}
              disabled={!currentClipboard}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onSendToPhone(currentClipboard)}
              disabled={!currentClipboard || onlinePeers.length === 0}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                isDark
                  ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                  : 'bg-[#211c19] text-white hover:bg-[#38302c]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Send to Phone</span>
            </button>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border text-xs max-h-36 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed ${
            isDark
              ? 'bg-black/30 border-white/[0.06] text-zinc-200'
              : 'bg-black/[0.02] border-black/[0.06] text-[#211c19]'
          }`}
        >
          {currentClipboard ? (
            currentClipboard.startsWith('[Image') ? (
              <div className="flex items-center space-x-2.5 font-medium py-1">
                <ImageIcon className="w-5 h-5 text-sky-500 shrink-0" />
                <span className="font-semibold">{currentClipboard}</span>
              </div>
            ) : (
              <div className="font-mono">{currentClipboard}</div>
            )
          ) : (
            <span className="opacity-50 italic font-sans">
              Clipboard is currently empty or contains non-text content.
            </span>
          )}
        </div>
      </div>

      {/* 3. Send Quick Text / URL Box */}
      <div className="kde-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Send Text, URL, or Note</h3>
            <p
              className={`text-xs font-medium mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Type or paste content to send to your phone or set on laptop clipboard.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
            }`}
            title="Attach file from File Manager"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attach File / Photo</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste link, OTP code, phone number, or notes here..."
          className={`w-full p-4 rounded-xl border text-xs font-medium focus:outline-none transition-colors resize-none ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-zinc-500 focus:border-zinc-400'
              : 'bg-white border-black/[0.08] text-[#211c19] placeholder-stone-400 focus:border-stone-500'
          }`}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div
            className={`flex items-center space-x-2 text-xs font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Target: {onlinePeers.length > 0 ? `${onlinePeers[0].name} (Connected)` : 'No phone connected'}
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={handleSetHostClipboard}
              disabled={!inputText.trim()}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Set on Laptop</span>
            </button>

            <button
              onClick={handleSendInput}
              disabled={!inputText.trim() || onlinePeers.length === 0}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                isDark
                  ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                  : 'bg-[#211c19] text-white hover:bg-[#38302c]'
              }`}
            >
              {sentSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Send className="w-3.5 h-3.5 stroke-[1.8]" />}
              <span>{sentSuccess ? 'Sent to Phone!' : 'Send to Phone'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
