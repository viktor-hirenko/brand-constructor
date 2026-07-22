import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // Unified single-origin dev (Variant 3): the admin dev server is the one
      // origin. `/wizard/*` (HTTP + HMR websocket) is forwarded to the
      // constructor dev server, which is configured with `base: '/wizard/'`.
      // Everything the browser sees lives on http://localhost:5173, so the
      // auth cookie is shared between admin and wizard exactly like production.
      '/wizard': {
        target: 'http://localhost:5174',
        changeOrigin: false,
        ws: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;\n`,
      },
    },
  },
});
