import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { fn } from '@storybook/test';
import ExternalNamingGrid from '@/components/constructor/alternative-selection/ExternalNamingGrid.vue';
import { externalNamingGridItems } from '../mocks/fixtures';

const meta = {
  title: 'Grids/ExternalNamingGrid',
  component: ExternalNamingGrid,
  tags: ['autodocs'],
  args: { onToggle: fn() },
  parameters: { cardWidth: 'full' as const },
} satisfies Meta<typeof ExternalNamingGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static snapshot: one card pre-selected */
export const Default: Story = {
  args: {
    namings: externalNamingGridItems,
    selectedIds: ['ext-winphoria'],
  },
};

/** Static snapshot: limit reached — other cards are dimmed */
export const AtSelectionLimit: Story = {
  args: {
    namings: externalNamingGridItems,
    selectedIds: ['ext-winphoria', 'ext-winstery', 'ext-nova'],
    maxSelectable: 3,
  },
};

/**
 * Interactive — click to toggle selection (up to 3).
 * Uses local ref so toggles actually reflect in the UI.
 */
export const Interactive: Story = {
  name: 'Interactive ▶ click to toggle (max 3)',
  render: (args) => ({
    components: { ExternalNamingGrid },
    setup() {
      const selectedIds = ref<string[]>([]);
      const max = args.maxSelectable ?? 3;
      function onToggle(id: string) {
        const idx = selectedIds.value.indexOf(id);
        if (idx >= 0) {
          selectedIds.value = selectedIds.value.filter((i) => i !== id);
        } else if (selectedIds.value.length < max) {
          selectedIds.value = [...selectedIds.value, id];
        }
        args.onToggle?.(id);
      }
      return { namings: args.namings, selectedIds, maxSelectable: max, onToggle };
    },
    template: `
      <ExternalNamingGrid
        :namings="namings"
        :selected-ids="selectedIds"
        :max-selectable="maxSelectable"
        @toggle="onToggle"
      />
    `,
  }),
  args: {
    namings: externalNamingGridItems,
    selectedIds: [],
    maxSelectable: 3,
  },
};
