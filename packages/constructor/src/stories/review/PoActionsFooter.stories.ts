import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import PoActionsFooter from '@/components/constructor/review/PoActionsFooter.vue';

const meta = {
  title: 'Review/PoActionsFooter',
  component: PoActionsFooter,
  tags: ['autodocs'],
  args: {
    onSubmit: fn(),
    onBack: fn(),
    onShare: fn(),
    onPdf: fn(),
  },
} satisfies Meta<typeof PoActionsFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PoDraft: Story = {
  args: {
    submitLabel: 'На погодження CEO',
    showSubmit: true,
    showBack: true,
    showPdf: true,
  },
};

export const PoReturned: Story = {
  args: {
    submitLabel: 'На погодження CEO',
    showSubmit: true,
    showBack: false,
    showPdf: false,
  },
};

export const SubmitDisabled: Story = {
  args: {
    submitLabel: 'На погодження CEO',
    showSubmit: true,
    submitDisabled: true,
  },
};

/** Submit button in loading state (API call in flight) */
export const Loading: Story = {
  args: {
    submitLabel: 'На погодження CEO',
    showSubmit: true,
    loading: true,
  },
};

/** Approved read-only view: no submit/back, only Share + Download PDF */
export const ApprovedView: Story = {
  args: {
    showSubmit: false,
    showBack: false,
    showShare: true,
    showPdf: true,
  },
};

/** Share link was copied to clipboard */
export const ShareCopied: Story = {
  args: {
    showSubmit: false,
    showBack: false,
    showShare: true,
    shareCopied: true,
  },
};

/** PDF is being generated */
export const PdfLoading: Story = {
  args: {
    showSubmit: false,
    showBack: false,
    showPdf: true,
    pdfLoading: true,
  },
};
