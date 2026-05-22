import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { fn } from '@storybook/test';
import ConceptGrid from '@/components/constructor/ceo-reselect/ConceptGrid.vue';
import { conceptGridItems } from '../mocks/fixtures';

const meta = {
  title: 'Grids/ConceptGrid',
  component: ConceptGrid,
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
  },
  parameters: { cardWidth: 'full' as const },
} satisfies Meta<typeof ConceptGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static snapshot: first card pre-selected */
export const Default: Story = {
  args: {
    concepts: conceptGridItems,
    selectedId: conceptGridItems[0]?.id ?? null,
    previewId: conceptGridItems[0]?.id ?? null,
  },
};

/** Static snapshot: nothing selected */
export const NothingSelected: Story = {
  args: {
    concepts: conceptGridItems,
    selectedId: null,
    previewId: null,
  },
};

/**
 * Interactive — click a card to select it.
 * Uses local ref so the selection actually changes visually.
 */
export const Interactive: Story = {
  name: 'Interactive ▶ click to select',
  render: (args) => ({
    components: { ConceptGrid },
    setup() {
      const selectedId = ref<string | null>(null);
      const previewId = ref<string | null>(null);
      function onSelect(id: string) {
        selectedId.value = id;
        previewId.value = id;
        args.onSelect?.(id);
      }
      return { concepts: args.concepts, selectedId, previewId, onSelect };
    },
    template: `
      <ConceptGrid
        :concepts="concepts"
        :selected-id="selectedId"
        :preview-id="previewId"
        @select="onSelect"
      />
    `,
  }),
  args: {
    concepts: conceptGridItems,
    selectedId: null,
    previewId: null,
  },
};

/** Disabled — no clicks go through */
export const Disabled: Story = {
  args: {
    concepts: conceptGridItems,
    selectedId: null,
    previewId: null,
    disabled: true,
  },
};
