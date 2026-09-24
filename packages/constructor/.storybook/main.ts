import type { StorybookConfig } from '@storybook/vue3-vite';
import { mergeConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|tsx|vue)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': resolve(__dirname, '../src'),
        },
      },
      // The SCSS preprocessor block that stood here is gone with DP-15258
      // phase 19 — see the note in `vite.config.ts`. Storybook mirrors the app
      // config, so it must not resurrect `@/styles/variables` either.
    });
  },
};

export default config;
