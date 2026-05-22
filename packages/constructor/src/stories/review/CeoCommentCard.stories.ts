import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { fn } from '@storybook/test';
import CeoCommentCard from '@/components/constructor/review/CeoCommentCard.vue';
import { CEO_COMMENT } from '../mocks/fixtures';

const meta = {
  title: 'Review/CeoCommentCard',
  component: CeoCommentCard,
  tags: ['autodocs'],
  args: {
    value: CEO_COMMENT,
    onResolve: fn(),
    onUnresolve: fn(),
  },
} satisfies Meta<typeof CeoCommentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static: unresolved state — blue left stripe, "Позначити як вирішений" button */
export const Unresolved: Story = {
  args: {
    resolved: false,
    canResolve: true,
  },
};

/** Static: resolved state — "Вирішено" button (hover → "Повернути") */
export const Resolved: Story = {
  args: {
    resolved: true,
    canResolve: true,
  },
};

/** Static: read-only — no action buttons (e.g. CEO's own comment in CEO view) */
export const ReadonlyNoActions: Story = {
  args: {
    resolved: false,
    canResolve: false,
  },
};

/** Static: API call in-flight — buttons disabled */
export const Loading: Story = {
  args: {
    resolved: false,
    canResolve: true,
    loading: true,
  },
};

/**
 * Interactive — click "Позначити як вирішений" / "Повернути" to toggle.
 * Simulates a 600 ms API round-trip (loading state) before state flips.
 */
export const Interactive: Story = {
  name: 'Interactive ▶ click to resolve / unresolve',
  render: (args) => ({
    components: { CeoCommentCard },
    setup() {
      const resolved = ref(false);
      const loading = ref(false);

      async function onResolve() {
        loading.value = true;
        await new Promise((r) => setTimeout(r, 600));
        resolved.value = true;
        loading.value = false;
        args.onResolve?.();
      }

      async function onUnresolve() {
        loading.value = true;
        await new Promise((r) => setTimeout(r, 600));
        resolved.value = false;
        loading.value = false;
        args.onUnresolve?.();
      }

      return { value: args.value, resolved, loading, onResolve, onUnresolve };
    },
    template: `
      <CeoCommentCard
        :value="value"
        :resolved="resolved"
        :loading="loading"
        :can-resolve="true"
        @resolve="onResolve"
        @unresolve="onUnresolve"
      />
    `,
  }),
  args: { value: CEO_COMMENT, resolved: false },
};
