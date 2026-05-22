import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { fn } from '@storybook/test';
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue';
import CeoCommentReadonly from '@/components/constructor/edit-flow/CeoCommentReadonly.vue';
import { CEO_COMMENT } from '../mocks/fixtures';

const meta = {
  title: 'Fields/StepCommentField',
  component: StepCommentField,
  tags: ['autodocs'],
} satisfies Meta<typeof StepCommentField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { StepCommentField },
    setup() {
      const modelValue = ref('');
      return { args, modelValue };
    },
    template: '<StepCommentField v-bind="args" v-model="modelValue" />',
  }),
  args: {
    label: 'Коментар',
    placeholder: 'Додайте ваші коментарі або побажання...',
  },
};

export const CeoLabel: Story = {
  render: Default.render,
  args: {
    label: 'Коментар СЕО',
    placeholder: 'Додайте коментар СЕО...',
  },
};

export const Optional: Story = {
  render: Default.render,
  args: {
    optional: true,
  },
};

export const RequiredEmpty: Story = {
  render: Default.render,
  args: {
    required: true,
    requiredHint: 'Коментар обовʼязковий для нового брифу',
  },
};

export const Filled: Story = {
  render: args => ({
    components: { StepCommentField },
    setup() {
      const modelValue = ref(CEO_COMMENT);
      return { args, modelValue };
    },
    template: '<StepCommentField v-bind="args" v-model="modelValue" />',
  }),
  args: {
    label: 'Коментар СЕО',
  },
};

export const CeoCommentReadonlyBlock: StoryObj = {
  name: 'CeoCommentReadonly (PO edit flow)',
  render: () => ({
    components: { CeoCommentReadonly },
    setup() {
      return { value: CEO_COMMENT };
    },
    template: '<CeoCommentReadonly :value="value" />',
  }),
};
