import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { assetFallbackPlugin, readAssetFallbackEnv } from '@brand-constructor/shared/dev';

// Base path strategy (Variant 3 — unified single-origin Admin + Wizard):
//   - Default ('/wizard/'): dev server + the unified build, where the wizard
//     is served under the `/wizard/` path prefix on one shared origin.
//   - `WIZARD_STANDALONE=true`: legacy standalone build served at the root of
//     `brand-constructor-app.pages.dev`. Kept working so MVP bugfixes can
//     still be deployed to the old project until the single-origin cutover.
// `import.meta.env.BASE_URL` reflects this for the router history base and any
// absolute in-app links.
const base = process.env.WIZARD_STANDALONE === 'true' ? '/' : '/wizard/';

const WORKER_ORIGIN = 'http://localhost:8787';

export default defineConfig(({ mode }) => {
  // VITE_USE_PROD_ASSETS / VITE_PROD_API_ORIGIN from `.env.development` turn on
  // the dev-only fallback that serves `/api/assets/*` from production when the
  // local R2 bucket has no such object.
  const assetFallback = readAssetFallbackEnv(loadEnv(mode, __dirname, 'VITE_'));

  return {
    base,
    plugins: [
      tailwindcss(),
      vue(),
      assetFallbackPlugin({ ...assetFallback, workerOrigin: WORKER_ORIGIN }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: WORKER_ORIGIN,
          changeOrigin: true,
        },
      },
    },
    // No `css.preprocessorOptions.scss` here on purpose. DP-15258 phase 19
    // moved the last SCSS consumer (`views/LoginView.vue`) to Tailwind and
    // deleted `src/styles/{_variables,_mixins,global}.scss` with it, so there
    // is nothing left for a preprocessor to preprocess. Re-adding the block
    // would also re-open the way back for `global.scss`, whose
    // `html { font-size: 16px }` silently kills the wizard's embed scale —
    // guarded by `tests/unit/styles/legacyScss.test.ts`.
  };
});
