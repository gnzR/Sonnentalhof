import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';

const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;
const ROOT_DIR = process.cwd();
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

interface DesktopBuildInfo {
  filename: string;
  platform: 'linux' | 'windows' | 'checksum';
  label: string;
  sizeBytes: number;
  downloadUrl: string;
  sha256?: string;
}

function getSha256Map(): Record<string, string> {
  const sumPath = path.join(RELEASE_DIR, 'SHA256SUMS.txt');
  if (!fs.existsSync(sumPath)) return {};
  const map: Record<string, string> = {};
  const lines = fs.readFileSync(sumPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (match) {
      map[path.basename(match[2].trim())] = match[1].toLowerCase();
    }
  }
  return map;
}

function listDesktopBuilds(): DesktopBuildInfo[] {
  if (!fs.existsSync(RELEASE_DIR)) return [];
  const entries = fs.readdirSync(RELEASE_DIR, { withFileTypes: true });
  const sums = getSha256Map();
  const results: DesktopBuildInfo[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filename = entry.name;
    if (
      !filename.endsWith('.tar.gz') &&
      !filename.endsWith('.exe') &&
      filename !== 'SHA256SUMS.txt'
    ) {
      continue;
    }
    const fullPath = path.join(RELEASE_DIR, filename);
    const stat = fs.statSync(fullPath);

    let platform: DesktopBuildInfo['platform'] = 'checksum';
    let label = 'SHA-256 Prüfsummen';
    if (filename.endsWith('.tar.gz')) {
      platform = 'linux';
      label = 'CachyOS / Linux (.tar.gz) · Beta 1.1';
    } else if (filename.endsWith('.exe')) {
      platform = 'windows';
      label = 'Windows 10/11 Setup (.exe) · Beta 1.1';
    }

    results.push({
      filename,
      platform,
      label,
      sizeBytes: stat.size,
      downloadUrl: `/downloads/${encodeURIComponent(filename)}`,
      sha256: sums[filename],
    });
  }

  const order = { linux: 0, windows: 1, checksum: 2 };
  return results.sort((a, b) => order[a.platform] - order[b.platform]);
}

async function startServer() {
  const app = express();

  app.get('/api/desktop-builds', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ builds: listDesktopBuilds() });
  });

  app.get('/api/desktop-builds/chunk/:filename', (req: Request, res: Response) => {
    const requested = path.basename(String(req.params.filename || ''));
    const allowed = listDesktopBuilds().find((b) => b.filename === requested);
    if (!allowed) {
      res.status(404).send('Datei nicht gefunden.');
      return;
    }

    const filePath = path.join(RELEASE_DIR, allowed.filename);
    const totalSize = allowed.sizeBytes;
    const rawStart = Number(req.query.start ?? 0);
    const rawEnd = Number(req.query.end ?? Math.min(totalSize - 1, rawStart + 8 * 1024 * 1024 - 1));

    if (!Number.isInteger(rawStart) || !Number.isInteger(rawEnd) || rawStart < 0 || rawEnd < rawStart || rawStart >= totalSize) {
      res.status(400).send('Ungültiger Byte-Bereich.');
      return;
    }

    const maxChunkBytes = 16 * 1024 * 1024;
    const clampedEnd = Math.min(rawEnd, totalSize - 1, rawStart + maxChunkBytes - 1);
    const chunkLength = clampedEnd - rawStart + 1;

    res.status(200);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(chunkLength));
    res.setHeader('Cache-Control', 'no-store');

    const stream = fs.createReadStream(filePath, { start: rawStart, end: clampedEnd });
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).send('Lesefehler.');
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  });

  app.get('/downloads/:filename', (req: Request, res: Response) => {
    const requested = path.basename(String(req.params.filename || ''));
    const allowed = listDesktopBuilds().find((b) => b.filename === requested);
    if (!allowed) {
      res.status(404).send('Datei nicht gefunden.');
      return;
    }
    const filePath = path.join(RELEASE_DIR, allowed.filename);
    res.download(filePath, allowed.filename);
  });

  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, res: Response, next) => {
      res.on('finish', () => {
        if (res.statusCode >= 400 && !req.originalUrl.includes('favicon.ico')) {
          console.error(`[HTTP ${res.statusCode}] ${req.method} ${req.originalUrl}`);
        }
      });
      next();
    });

    if (process.env.DISABLE_HMR === 'true') {
      app.get('/@vite/client', (_req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`);
      });
    }

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sonnental Hof server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
