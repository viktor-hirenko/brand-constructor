import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import ReviewPrPackageBlock from '@/components/constructor/review/ReviewPrPackageBlock.vue';

const meta = {
  title: 'Review/ReviewPrPackageBlock',
  component: ReviewPrPackageBlock,
  tags: ['autodocs'],
  args: {
    title: 'Media Reputation',
    onView: fn(),
  },
} satisfies Meta<typeof ReviewPrPackageBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongTitle: Story = {
  args: {
    title: 'Full PR Package with Influencer Outreach & Media Reputation',
  },
};
