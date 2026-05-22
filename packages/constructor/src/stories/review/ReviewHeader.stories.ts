import type { Meta, StoryObj } from '@storybook/vue3';
import ReviewHeader from '@/components/constructor/review/ReviewHeader.vue';

const meta = {
  title: 'Review/ReviewHeader',
  component: ReviewHeader,
  tags: ['autodocs'],
  parameters: { cardWidth: 'full' as const },
} satisfies Meta<typeof ReviewHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** PO final step: wizard complete, ready to submit */
export const PoDraftReady: Story = {
  args: {
    title: 'Final review',
    subtitle: 'Перевірте всі дані перед відправкою',
    status: 'draft',
    currentStep: 8,
    totalSteps: 8,
    progressPercent: 100,
    infoOverride: {
      title: 'Бриф готовий!',
      description:
        'Перегляньте всю інформацію справа. Ви можете поділитися брифом або зберегти його для подальшої роботи.',
      iconVariant: 'check' as const,
    },
  },
};

/** Brief submitted → CEO is reviewing */
export const Submitted: Story = {
  args: {
    title: 'JoyMania',
    status: 'submitted',
  },
};

/** CEO returned the brief with comments */
export const NeedsRevision: Story = {
  args: {
    title: 'JoyMania',
    status: 'needs_revision',
    infoOverride: {
      title: '4 секції потребують уваги',
      description:
        'Перегляньте коментарі та зміни від СЕО і оновіть бриф перед повторним відправленням.',
      iconVariant: 'warning' as const,
    },
  },
};

/** Brief approved by CEO */
export const Approved: Story = {
  args: {
    title: 'JoyMania',
    status: 'approved',
  },
};

/** CEO review mode: brief submitted, CEO is leaving comments */
export const CeoSubmittedView: Story = {
  args: {
    title: 'JoyMania',
    status: 'submitted',
    infoOverride: {
      title: 'Бриф на розгляді',
      description:
        'Перегляньте бриф та залиште коментарі. Затвердіть або поверніть на доопрацювання.',
    },
  },
};

/** PO mid-wizard: step progress visible */
export const WithProgress: Story = {
  args: {
    title: 'JoyMania',
    status: 'draft',
    currentStep: 5,
    totalSteps: 8,
    progressPercent: 62,
  },
};
