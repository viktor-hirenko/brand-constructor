import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import ReviewExternalNamingsList from '@/components/constructor/review/ReviewExternalNamingsList.vue';
import { ceoExternalItems, externalNamingItems } from '../mocks/fixtures';

const meta = {
  title: 'Review/ReviewExternalNamingsList',
  component: ReviewExternalNamingsList,
  tags: ['autodocs'],
  args: {
    onApplyCeo: fn(),
    onPreviewBrief: fn(),
  },
} satisfies Meta<typeof ReviewExternalNamingsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePoList: Story = {
  args: {
    items: externalNamingItems,
    ceoItems: [],
  },
};

export const DualWithApplyCeo: Story = {
  args: {
    items: externalNamingItems,
    ceoItems: ceoExternalItems,
    showApplyCeo: true,
  },
};

export const CeoApplied: Story = {
  args: {
    items: ceoExternalItems,
    ceoApplied: true,
  },
};

export const NewBriefPlaceholder: Story = {
  args: {
    items: [],
    isNewBrief: true,
  },
};
