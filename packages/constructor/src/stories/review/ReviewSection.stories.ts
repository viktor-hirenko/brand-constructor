import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import ReviewSection from '@/components/constructor/review/ReviewSection.vue';
import UiProperty from '@/components/ui/UiProperty.vue';
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
    components: { ReviewSection, UiProperty, GlobeIcon, CalendarIcon },
    setup() {
      return { args };
    },
    template: `
      <ReviewSection v-bind="args">
        <UiProperty label="Географія" value="UK">
          <template #icon="{ iconClass }"><GlobeIcon :class="iconClass" /></template>
        </UiProperty>
        <UiProperty label="Дата запуску" value="10 квітня 2026">
          <template #icon="{ iconClass }"><CalendarIcon :class="iconClass" /></template>
        </UiProperty>
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
        <p class="text-sm text-ink-700">Контент секції — див. ReviewConceptBlock</p>
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
    components: { ReviewSection, UiProperty, SectionCommentBlock, GlobeIcon, CalendarIcon },
    setup() {
      return { args, poComment: PO_COMMENT, ceoComment: CEO_COMMENT };
    },
    template: `
      <ReviewSection v-bind="args">
        <UiProperty label="Географія" value="UK">
          <template #icon="{ iconClass }"><GlobeIcon :class="iconClass" /></template>
        </UiProperty>
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
