import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import DatePicker from '@/components/constructor/fields/DatePicker.vue';

const meta = {
  title: 'Fields/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: { cardWidth: 520 },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive — click the button to open the calendar, pick a date.
 * DatePicker is self-contained (manages open/close internally).
 */
export const Interactive: Story = {
  name: 'Interactive ▶ click to open calendar',
  render: () => ({
    components: { DatePicker },
    setup() {
      const date = ref('');
      return { date };
    },
    template: '<div class="p-4"><DatePicker v-model="date" /></div>',
  }),
};

/** Pre-filled with a date value */
export const WithDate: Story = {
  render: () => ({
    components: { DatePicker },
    setup() {
      const date = ref('2026-06-15');
      return { date };
    },
    template: '<div class="p-4"><DatePicker v-model="date" /></div>',
  }),
};

/** minDate blocks past dates — today and earlier are disabled */
export const WithMinDate: Story = {
  render: () => ({
    components: { DatePicker },
    setup() {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const date = ref('');
      return { date, minDate: `${yyyy}-${mm}-${dd}` };
    },
    template: '<div class="p-4"><DatePicker v-model="date" :min-date="minDate" /></div>',
  }),
};
