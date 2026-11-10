import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Default public origin so %VITE_SITE_URL% in index.html always resolves.
process.env.VITE_SITE_URL = (process.env.VITE_SITE_URL || 'https://worldstream-tv.pages.dev').replace(/\/+$/, '');

export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: mode !== 'production',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          player: ['hls.js/light'],
          data: ['@tanstack/react-query', '@tanstack/react-virtual', 'zustand'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/scripts/**/*.test.ts'],
    css: false,
  },
}));
