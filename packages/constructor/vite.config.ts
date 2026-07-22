import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// Base path strategy (Variant 3 — unified single-origin Admin + Wizard):
//   - Default ('/wizard/'): dev server + the unified build, where the wizard
//     is served under the `/wizard/` path prefix on one shared origin.
//   - `WIZARD_STANDALONE=true`: legacy standalone build served at the root of
//     `brand-constructor-app.pages.dev`. Kept working so MVP bugfixes can
//     still be deployed to the old project until the single-origin cutover.
// `import.meta.env.BASE_URL` reflects this for the router history base and any
// absolute in-app links.
const base = process.env.WIZARD_STANDALONE === 'true' ? '/' : '/wizard/';

export default defineConfig({
  base,
  plugins: [tailwindcss(), vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
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
