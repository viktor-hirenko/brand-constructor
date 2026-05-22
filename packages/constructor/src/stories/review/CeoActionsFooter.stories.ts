import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import CeoActionsFooter from '@/components/constructor/review/CeoActionsFooter.vue';

const meta = {
  title: 'Review/CeoActionsFooter',
  component: CeoActionsFooter,
  tags: ['autodocs'],
  args: {
    onApprove: fn(),
    onRevise: fn(),
  },
} satisfies Meta<typeof CeoActionsFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showApprove: true,
    showRevise: true,
  },
};

export const WithWarning: Story = {
  args: {
    showApprove: true,
    showRevise: true,
    warning: 'Додайте коментар хоча б в одну секцію перед відправкою на доопрацювання.',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

/** CEO has already returned the brief — only "Approve" remains */
export const ApproveOnly: Story = {
  args: {
    showApprove: true,
    showRevise: false,
  },
};

/** Brief is approved — only "Return for revision" remains (edge case) */
export const ReviseOnly: Story = {
  args: {
    showApprove: false,
    showRevise: true,
  },
};
