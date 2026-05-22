import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { fn } from '@storybook/test';
import InternalNamingGrid from '@/components/constructor/ceo-reselect/InternalNamingGrid.vue';
import { internalNamingGridItems } from '../mocks/fixtures';

const meta = {
  title: 'Grids/InternalNamingGrid',
  component: InternalNamingGrid,
  tags: ['autodocs'],
  args: { onSelect: fn() },
  parameters: { cardWidth: 'full' as const },
} satisfies Meta<typeof InternalNamingGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static snapshot: first item pre-selected */
export const Default: Story = {
  args: {
    namings: internalNamingGridItems,
    selectedId: internalNamingGridItems[0]?.id ?? null,
  },
};

/** Static snapshot: nothing selected */
export const NothingSelected: Story = {
  args: {
    namings: internalNamingGridItems,
    selectedId: null,
  },
};

/**
 * Interactive — click a card to select it.
 * Uses local ref so the active card actually changes visually.
 */
export const Interactive: Story = {
  name: 'Interactive ▶ click to select',
  render: (args) => ({
    components: { InternalNamingGrid },
    setup() {
      const selectedId = ref<string | null>(null);
      function onSelect(id: string) {
        selectedId.value = id;
        args.onSelect?.(id);
      }
      return { namings: args.namings, selectedId, onSelect };
    },
    template: `
      <InternalNamingGrid
        :namings="namings"
        :selected-id="selectedId"
        @select="onSelect"
      />
    `,
  }),
  args: {
    namings: internalNamingGridItems,
    selectedId: null,
  },
};
