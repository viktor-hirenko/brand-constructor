import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import GeoMultiSelect from '@/components/constructor/fields/GeoMultiSelect.vue';

const meta = {
  title: 'Fields/GeoMultiSelect',
  component: GeoMultiSelect,
  tags: ['autodocs'],
  parameters: { cardWidth: 520 },
} satisfies Meta<typeof GeoMultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive — click to open dropdown, search and select countries.
 * GeoMultiSelect manages its own open/close state internally.
 */
export const Interactive: Story = {
  name: 'Interactive ▶ click to open, type to search',
  render: () => ({
    components: { GeoMultiSelect },
    setup() {
      const selected = ref<string[]>([]);
      return { selected };
    },
    template: '<div class="p-4 pb-64"><GeoMultiSelect v-model="selected" /></div>',
  }),
  args: { modelValue: [] },
};

/** Pre-selected countries */
export const WithPreselected: Story = {
  render: () => ({
    components: { GeoMultiSelect },
    setup() {
      const selected = ref<string[]>(['GB', 'UA', 'DE']);
      return { selected };
    },
    template: '<div class="p-4 pb-64"><GeoMultiSelect v-model="selected" /></div>',
  }),
  args: { modelValue: ['GB', 'UA', 'DE'] },
};
