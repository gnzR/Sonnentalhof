import React, { useEffect, useRef, useState } from 'react';
import { isDesktopClient } from '../utils/runtimeEnv';

const Monitor: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const Terminal: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" x2="20" y1="19" y2="19" />
  </svg>
);

const Download: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const Loader2: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const X: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckCircle2: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ShieldAlert: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

interface DesktopBuildItem {
  filename: string;
  platform: 'linux' | 'windows' | 'checksum';
  label: string;
  sizeBytes: number;
  downloadUrl: string;
  sha256?: string;
}

const CHUNK_SIZE_BYTES = 8 * 1024 * 1024; // 8 MiB per request (safely below Cloud Run's 32 MiB limit)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DesktopDownloadsCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [builds, setBuilds] = useState<DesktopBuildItem[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [progressBytes, setProgressBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [completedFile, setCompletedFile] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isDesktopClient()) return;
    let active = true;
    fetch('/api/desktop-builds')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && Array.isArray(data.builds)) {
          setBuilds(data.builds);
        }
      })
      .catch(() => {
        // Offline or static file context: hide card quietly
      });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  const handleChunkedDownload = async (item: DesktopBuildItem) => {
    if (downloadingFile) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setDownloadingFile(item.filename);
    setProgressBytes(0);
    setTotalBytes(item.sizeBytes);
    setCompletedFile(null);
    setErrorMsg(null);

    try {
      const chunks: BlobPart[] = [];
      let offset = 0;

      while (offset < item.sizeBytes) {
        const end = Math.min(item.sizeBytes - 1, offset + CHUNK_SIZE_BYTES - 1);
        const expectedLen = end - offset + 1;
        let buffer: ArrayBuffer | null = null;
        let lastErr: unknown = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(
              `/api/desktop-builds/chunk/${encodeURIComponent(item.filename)}?start=${offset}&end=${end}`,
              { signal: controller.signal }
            );
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const ab = await res.arrayBuffer();
            if (ab.byteLength !== expectedLen) {
              throw new Error(`Unvollständiger Block (${ab.byteLength}/${expectedLen} Bytes)`);
            }
            buffer = ab;
            break;
          } catch (err) {
            if (controller.signal.aborted) throw err;
            lastErr = err;
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        if (!buffer) {
          throw lastErr instanceof Error ? lastErr : new Error('Download fehlgeschlagen');
        }

        chunks.push(buffer);
        offset = end + 1;
        setProgressBytes(offset);
      }

      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      setCompletedFile(item.filename);
    } catch (err) {
      if (!controller.signal.aborted) {
        const reason = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setErrorMsg(`Download fehlgeschlagen (${reason}). Bitte erneut versuchen.`);
      }
    } finally {
      abortRef.current = null;
      setDownloadingFile(null);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDownloadingFile(null);
    setProgressBytes(0);
    setTotalBytes(0);
  };

  if (isDesktopClient() || builds.length === 0) return null;

  const installers = builds.filter((b) => b.platform !== 'checksum');
  const checksumFile = builds.find((b) => b.platform === 'checksum');

  if (installers.length === 0) return null;

  const pct = totalBytes > 0 ? Math.min(100, Math.round((progressBytes / totalBytes) * 100)) : 0;

  return (
    <div className={`rounded-xl border border-[#d6c7ae] bg-[#f6efe2] ${compact ? 'p-3.5 space-y-2.5' : 'p-4 space-y-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[#4a321f]" />
          <h3 className="font-display font-bold text-sm text-[#2b2118]">
            Offline Desktop-Builds herunterladen
          </h3>
        </div>
        {checksumFile && (
          <a
            href={checksumFile.downloadUrl}
            download={checksumFile.filename}
            className="text-[11px] font-semibold text-[#5c4632] underline hover:text-[#2b2118]"
          >
            SHA-256 Prüfsummen
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {installers.map((item) => {
          const isActive = downloadingFile === item.filename;
          const isDone = completedFile === item.filename && !isActive;
          const isDisabled = downloadingFile !== null && !isActive;

          return (
            <button
              key={item.filename}
              type="button"
              disabled={isDisabled}
              onClick={() => (isActive ? handleCancel() : handleChunkedDownload(item))}
              className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-colors shadow-xs ${
                isActive
                  ? 'bg-amber-50 border-amber-600 text-[#2b2118]'
                  : isDone
                    ? 'bg-emerald-50 border-emerald-700 text-[#2b2118]'
                    : isDisabled
                      ? 'bg-white/60 border-[#d6c7ae] text-[#7a644e] opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-[#efe6d5] border-[#cbb99d] text-[#2b2118]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-xs flex items-center gap-1.5">
                  {item.platform === 'linux' ? (
                    <Terminal className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  ) : (
                    <Monitor className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="text-[11px] text-[#5c4632] font-mono-num truncate mt-0.5">
                  {isActive
                    ? `Lädt: ${formatSize(progressBytes)} / ${formatSize(totalBytes)} (${pct}%)`
                    : `${item.filename} · ${formatSize(item.sizeBytes)}`}
                </div>
              </div>
              {isActive ? (
                <div className="flex items-center gap-1 shrink-0 text-amber-800" title="Abbrechen">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <X className="w-3.5 h-3.5" />
                </div>
              ) : isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-[#4a321f] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {downloadingFile && (
        <div className="w-full h-2 rounded-full bg-[#e2d3ba] overflow-hidden">
          <div
            className="h-full bg-emerald-700 transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {errorMsg && (
        <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-[#5c4632] leading-snug">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
        <span>
          <strong>Windows 10/11 Hinweis:</strong> Das Setup installiert sauber pro Benutzer (ohne Admin-Zwang). Da kein bezahltes Code-Signing-Zertifikat hinterlegt ist, kann SmartScreen beim ersten Start einmalig „Unbekannter Herausgeber“ zeigen → „Weitere Informationen“ → „Trotzdem ausführen“.
        </span>
      </div>
    </div>
  );
};
