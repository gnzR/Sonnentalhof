import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const macosVersion = require('app-builder-lib/out/util/macosVersion');

// On headless Linux containers (e.g. gVisor) without functioning Wine,
// electron-builder's built-in pure-JS UninstallerReader extracts the NSIS
// uninstaller binary cleanly without spawning wine/wineboot.
if (process.platform !== 'win32') {
  macosVersion.isMacOsCatalina = () => true;
}

const builder = require('electron-builder');
const config = JSON.parse(fs.readFileSync(path.resolve('electron-builder.json'), 'utf8'));
const args = process.argv.slice(2);
const prepackagedIdx = args.indexOf('--prepackaged');
const prepackaged =
  prepackagedIdx !== -1 && args[prepackagedIdx + 1] ? path.resolve(args[prepackagedIdx + 1]) : undefined;

const result = await builder.build({
  targets: builder.Platform.WINDOWS.createTarget('nsis', builder.Arch.x64),
  config,
  ...(prepackaged ? { prepackaged } : {}),
});

console.log('Windows NSIS build complete:', result);
process.exit(0);
