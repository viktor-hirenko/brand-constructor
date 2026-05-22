import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import ReviewSection from '@/components/constructor/review/ReviewSection.vue';
import ReviewSectionRow from '@/components/constructor/review/ReviewSectionRow.vue';
import SectionCommentBlock from '@/components/constructor/fields/SectionCommentBlock.vue';
import GlobeIcon from '@/components/icons/GlobeIcon.vue';
import CalendarIcon from '@/components/icons/CalendarIcon.vue';
import { CEO_COMMENT, PO_COMMENT } from '../mocks/fixtures';

/**
 * Composite stories — full section cards as in Figma / Final review.
 */
const meta = {
  title: 'Composites/Brand Basics Section',
  parameters: { cardWidth: 520 },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Stable action spies — created once, not inside setup()
const onEdit = fn();

function brandBasicsTemplate(commentBlockArgs: Record<string, unknown>) {
  return {
    components: {
      ReviewSection,
      ReviewSectionRow,
      SectionCommentBlock,
      GlobeIcon,
      CalendarIcon,
    },
    setup() {
      return {
        poComment: PO_COMMENT,
        commentBlockArgs,
        onEdit,
      };
    },
    template: `
      <ReviewSection title="Brand Basics" :edit-step="1" @edit="onEdit">
        <ReviewSectionRow label="Географія" value="UK">
          <template #icon><GlobeIcon class="size-5" /></template>
        </ReviewSectionRow>
        <ReviewSectionRow label="Дата запуску" value="10 квітня 2026">
          <template #icon><CalendarIcon class="size-5 text-[#5B5B62]" /></template>
        </ReviewSectionRow>
        <template #comment>
          <SectionCommentBlock
            section-key="basics"
            :po-comment="poComment"
            v-bind="commentBlockArgs"
          />
        </template>
      </ReviewSection>
    `,
  };
}

/** Figma 1566:28945 — PO comment + dashed CEO CTA */
export const CeoEmptyCta: Story = {
  render: () =>
    brandBasicsTemplate({
      ceoComment: '',
      ceoEditable: true,
    }),
};

/** Figma 1566:29006 — CEO textarea focused/expanded */
export const CeoEditing: Story = {
  render: () =>
    brandBasicsTemplate({
      ceoComment: '',
      ceoEditable: true,
      alwaysExpanded: true,
    }),
};

/** Figma 1566:29033 — both comments filled readonly */
export const BothCommentsFilled: Story = {
  render: () =>
    brandBasicsTemplate({
      ceoComment: CEO_COMMENT,
      ceoEditable: false,
    }),
};

/** Figma 1979:1363 — unresolved CEO comment with blue stripe */
export const CeoUnresolvedResolveUi: Story = {
  render: () => ({
    components: {
      ReviewSection,
      ReviewSectionRow,
      SectionCommentBlock,
      GlobeIcon,
      CalendarIcon,
    },
    setup() {
      return {
        poComment: PO_COMMENT,
        ceoComment: CEO_COMMENT,
        onEdit,
      };
    },
    template: `
      <ReviewSection title="Brand Basics" :edit-step="1" has-unresolved @edit="onEdit">
        <ReviewSectionRow label="Географія" value="UK">
          <template #icon><GlobeIcon class="size-5" /></template>
        </ReviewSectionRow>
        <ReviewSectionRow label="Дата запуску" value="10 квітня 2026">
          <template #icon><CalendarIcon class="size-5 text-[#5B5B62]" /></template>
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

/** Figma 1973:8015 — External naming with badge (content simplified) */
export const ExternalNamingNeedsChoice: Story = {
  render: () => ({
    components: { ReviewSection },
    setup() {
      return { onEdit, onApply: fn() };
    },
    template: `
      <ReviewSection
        title="External Naming"
        :edit-step="3"
        needs-choice
        @edit="onEdit"
      >
        <div class="flex flex-col gap-4 text-[16px] leading-6">
          <div>
            <p class="text-[14px] font-medium text-[#5B5B62] mb-2">Вибір замовника</p>
            <ul class="space-y-1">
              <li>• Winphoria (test.com)</li>
              <li>• Winstery (test.com)</li>
              <li>• Echo (test.com)</li>
            </ul>
          </div>
          <div>
            <p class="text-[14px] font-medium text-[#5B5B62] mb-2">Вибір CEO</p>
            <ul><li>• JoyMania (test.com)</li></ul>
          </div>
          <button
            type="button"
            class="w-full h-12 rounded-lg border border-black/10 bg-white text-[16px] font-medium"
            @click="onApply"
          >
            Застосувати варіант CEO
          </button>
        </div>
      </ReviewSection>
    `,
  }),
};
