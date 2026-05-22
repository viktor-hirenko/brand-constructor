import type { Preview } from '@storybook/vue3';
import '../src/styles/app.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f8f8f8' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (_, context) => {
      const width = context.parameters.cardWidth as number | 'full' | undefined;
      const style =
        width === 'full'
          ? 'width: 100%; max-width: 960px; margin: 0 auto;'
          : 'width: 100%; max-width: 520px; margin: 0 auto;';

      return {
        template: `<div style="${style}"><story/></div>`,
      };
    },
  ],
};

export default preview;
