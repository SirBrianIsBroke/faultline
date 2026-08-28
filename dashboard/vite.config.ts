import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { fs: { allow: [path.resolve(import.meta.dirname, '..')] } },
});
