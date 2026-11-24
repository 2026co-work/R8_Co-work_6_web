import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Custom Vite plugin ensuring dual-build parity:
 * Copies dist-data/ and timetable-standalone.html into dist/ on build completion.
 */
function copyDistAssetsPlugin() {
  return {
    name: 'copy-dist-assets',
    closeBundle() {
      // 1. Mirror dist-data/ into dist/dist-data/
      const srcDistData = resolve('dist-data');
      const destDistData = resolve('dist/dist-data');
      if (existsSync(srcDistData)) {
        mkdirSync(destDistData, { recursive: true });
        cpSync(srcDistData, destDistData, { recursive: true });
        console.log('[vite] Mirrored dist-data/ -> dist/dist-data/');
      }

      // 2. Mirror timetable-standalone.html into dist/
      const srcStandalone = resolve('timetable-standalone.html');
      const destStandalone = resolve('dist/timetable-standalone.html');
      if (existsSync(srcStandalone)) {
        cpSync(srcStandalone, destStandalone);
        console.log('[vite] Mirrored timetable-standalone.html -> dist/timetable-standalone.html');
      }

      // 3. Mirror manifest.webmanifest into dist/
      const srcManifest = resolve('manifest.webmanifest');
      const destManifest = resolve('dist/manifest.webmanifest');
      if (existsSync(srcManifest)) {
        cpSync(srcManifest, destManifest);
        console.log('[vite] Mirrored manifest.webmanifest -> dist/manifest.webmanifest');
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyDistAssetsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        portal: resolve('portal.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5181,
    strictPort: true,
  },
});
