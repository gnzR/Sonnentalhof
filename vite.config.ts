import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  const disableHmr = process.env.DISABLE_HMR === 'true';
  return {
    base: command === 'build' ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'exclude-aistudio-public-assets',
        closeBundle() {
          const copied = path.resolve(import.meta.dirname, 'dist', 'assets', 'aistudio');
          if (fs.existsSync(copied)) {
            fs.rmSync(copied, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    define: {
      __APP_BUILD_TAG__: JSON.stringify('beta-1.1-r2'),
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
      ],
      noDiscovery: true,
      rolldownOptions: {
        transform: {
          define: {
            __SONNENTAL_DEP_EPOCH__: '"beta-1.1-r4"',
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: !disableHmr,
      ws: disableHmr ? false : undefined,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: disableHmr
        ? null
        : {
            ignored: ['**/release/**', '**/dist/**', '**/electron/**'],
          },
    },
  };
});
