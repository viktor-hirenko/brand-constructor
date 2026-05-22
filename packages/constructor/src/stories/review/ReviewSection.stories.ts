import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import ReviewSection from '@/components/constructor/review/ReviewSection.vue';
import ReviewSectionRow from '@/components/constructor/review/ReviewSectionRow.vue';
import SectionCommentBlock from '@/components/constructor/fields/SectionCommentBlock.vue';
import GlobeIcon from '@/components/icons/GlobeIcon.vue';
import CalendarIcon from '@/components/icons/CalendarIcon.vue';
import { CEO_COMMENT, PO_COMMENT } from '../mocks/fixtures';

const meta = {
  title: 'Review/ReviewSection',
  component: ReviewSection,
  tags: ['autodocs'],
  args: {
    onEdit: fn(),
    onChange: fn(),
  },
} satisfies Meta<typeof ReviewSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Brand Basics',
    editStep: 1,
  },
  render: args => ({
    components: { ReviewSection, ReviewSectionRow, GlobeIcon, CalendarIcon },
    setup() {
      return { args };
    },
    template: `
      <ReviewSection v-bind="args">
        <ReviewSectionRow label="Географія" value="UK">
          <template #icon><GlobeIcon class="size-5" /></template>
        </ReviewSectionRow>
        <ReviewSectionRow label="Дата запуску" value="10 квітня 2026">
          <template #icon><CalendarIcon class="size-5 text-[#5B5B62]" /></template>
        </ReviewSectionRow>
      </ReviewSection>
    `,
  }),
};

export const WithChangeChoice: Story = {
  args: {
    title: 'Concept',
    changeChoice: true,
  },
  render: args => ({
    components: { ReviewSection },
    setup() {
      return { args };
    },
    template: `
      <ReviewSection v-bind="args">
        <p class="text-sm text-[#5B5B62]">Контент секції — див. ReviewConceptBlock</p>
      </ReviewSection>
    `,
  }),
};

export const NeedsChoiceBadge: Story = {
  args: {
    title: 'External Naming',
    editStep: 3,
    needsChoice: true,
  },
  render: Default.render,
};

export const UnresolvedDot: Story = {
  args: {
    title: 'Brand Basics',
    editStep: 1,
    hasUnresolved: true,
  },
  render: args => ({
    components: { ReviewSection, ReviewSectionRow, SectionCommentBlock, GlobeIcon, CalendarIcon },
    setup() {
      return { args, poComment: PO_COMMENT, ceoComment: CEO_COMMENT };
    },
    template: `
      <ReviewSection v-bind="args">
        <ReviewSectionRow label="Географія" value="UK">
          <template #icon><GlobeIcon class="size-5" /></template>
        </ReviewSectionRow>
        <template #comment>
          <SectionCommentBlock
            section-key="basics"
            :po-comment="poComment"
            :ceo-comment="ceoComment"
            :ceo-editable="false"
            show-resolve-ui
            :ceo-resolved="false"
            can-resolve
          />
        </template>
      </ReviewSection>
    `,
  }),
};

export const Highlighted: Story = {
  args: {
    title: 'Concept',
    highlighted: true,
    changeChoice: true,
  },
  render: Default.render,
};
