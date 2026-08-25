import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { assetFallbackPlugin, readAssetFallbackEnv } from '@brand-constructor/shared/dev';

const WORKER_ORIGIN = 'http://localhost:8787';

export default defineConfig(({ mode }) => {
  // VITE_USE_PROD_ASSETS / VITE_PROD_API_ORIGIN from `.env.development` turn on
  // the dev-only fallback that serves `/api/assets/*` from production when the
  // local R2 bucket has no such object. This dev server is the one origin in
  // unified dev, so the wizard inside the iframe gets its images from here.
  const assetFallback = readAssetFallbackEnv(loadEnv(mode, __dirname, 'VITE_'));

  return {
    plugins: [vue(), assetFallbackPlugin({ ...assetFallback, workerOrigin: WORKER_ORIGIN })],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: WORKER_ORIGIN,
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
  };
});
