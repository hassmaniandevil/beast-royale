import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@beast-royale/shared': resolve(__dirname, '../shared/src'),
    },
  },
  optimizeDeps: {
    include: ['pixi.js'],
  },
});
