import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import ReviewConceptBlock from '@/components/constructor/review/ReviewConceptBlock.vue';
import { mockCeoConcept, mockConcept } from '../mocks/fixtures';

const meta = {
  title: 'Review/ReviewConceptBlock',
  component: ReviewConceptBlock,
  tags: ['autodocs'],
  args: {
    mode: 'light' as const,
    onPreview: fn(),
    onApplyCeo: fn(),
    onPreviewBrief: fn(),
  },
} satisfies Meta<typeof ReviewConceptBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePoChoice: Story = {
  args: {
    concept: mockConcept(),
    ceoConcept: null,
    isNewConcept: false,
    showApplyCeo: false,
    ceoApplied: false,
  },
};

export const DualPoVsCeo: Story = {
  args: {
    concept: mockConcept(),
    ceoConcept: mockCeoConcept(),
    showApplyCeo: true,
    ceoApplied: false,
  },
};

export const CeoApplied: Story = {
  args: {
    concept: mockCeoConcept(),
    ceoConcept: null,
    ceoApplied: true,
  },
};

export const NewConceptBrief: Story = {
  args: {
    concept: null,
    isNewConcept: true,
  },
};

export const DarkMode: Story = {
  args: {
    concept: mockConcept({ mode: 'dark', name: 'Night Vegas' }),
    mode: 'dark',
  },
};
