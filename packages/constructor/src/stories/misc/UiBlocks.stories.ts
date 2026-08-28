import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import { ref } from 'vue';
import ReviewDeliverablesBlock from '@/components/constructor/review/ReviewDeliverablesBlock.vue';
import ReviewVisualComponentsBlock from '@/components/constructor/review/ReviewVisualComponentsBlock.vue';
import ReviewInternalNamingBlock from '@/components/constructor/review/ReviewInternalNamingBlock.vue';
import ApplyCeoVariantButton from '@/components/constructor/review/ApplyCeoVariantButton.vue';
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue';
import UiButton from '@/components/ui/UiButton.vue';
import CornerUpLeftIcon from '@/components/icons/CornerUpLeftIcon.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue';
import SectionStatusBadge from '@/components/ui/SectionStatusBadge.vue';
import StatusPillBadge from '@/components/ui/StatusPillBadge.vue';
import BrandBriefStatusBadge from '@/components/constructor/review/BrandBriefStatusBadge.vue';
import UnresolvedDot from '@/components/ui/UnresolvedDot.vue';

/**
 * Miscellaneous UI building blocks that don't warrant
 * their own story files yet. Add separate files as these grow.
 */
const meta = {
  title: 'Misc/UI Components',
  parameters: { cardWidth: 'full' as const },
} satisfies Meta;

export default meta;

// ─── ReviewDeliverablesBlock ────────────────────────────────────────────────

export const DeliverablesBlock: StoryObj = {
  name: 'ReviewDeliverablesBlock',
  render: () => ({
    components: { ReviewDeliverablesBlock },
    template:
      '<ReviewDeliverablesBlock scope="Legal Landing, Partner Landing" timing="15 травня 2026" />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── ReviewVisualComponentsBlock ───────────────────────────────────────────

export const VisualComponentsBlock: StoryObj = {
  name: 'ReviewVisualComponentsBlock',
  render: () => ({
    components: { ReviewVisualComponentsBlock },
    template: '<ReviewVisualComponentsBlock summary="Header, Footer, Promo Banner" />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── ReviewInternalNamingBlock ─────────────────────────────────────────────

export const InternalNamingSingle: StoryObj = {
  name: 'ReviewInternalNamingBlock / Single',
  render: () => ({
    components: { ReviewInternalNamingBlock },
    template: '<ReviewInternalNamingBlock po-value="Project Aurora" />',
  }),
  parameters: { cardWidth: 520 },
};

export const InternalNamingDual: StoryObj = {
  name: 'ReviewInternalNamingBlock / Dual + Apply CEO',
  render: () => ({
    components: { ReviewInternalNamingBlock },
    setup() {
      return { onApply: fn(), onPreview: fn() };
    },
    template: `
      <ReviewInternalNamingBlock
        po-value="Project Aurora"
        ceo-name="JoyMania"
        show-apply-ceo
        @apply-ceo="onApply"
        @preview-brief="onPreview"
      />
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const InternalNamingApplied: StoryObj = {
  name: 'ReviewInternalNamingBlock / CEO Applied',
  render: () => ({
    components: { ReviewInternalNamingBlock },
    template: '<ReviewInternalNamingBlock po-value="JoyMania" ceo-applied />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── ApplyCeoVariantButton ─────────────────────────────────────────────────

export const ApplyCeoButtonDefault: StoryObj = {
  name: 'ApplyCeoVariantButton / Default',
  render: () => ({
    components: { ApplyCeoVariantButton },
    setup() {
      return { onClick: fn() };
    },
    template: '<ApplyCeoVariantButton @click="onClick" />',
  }),
  parameters: { cardWidth: 520 },
};

export const ApplyCeoButtonLoading: StoryObj = {
  name: 'ApplyCeoVariantButton / Loading',
  render: () => ({
    components: { ApplyCeoVariantButton },
    template: '<ApplyCeoVariantButton :loading="true" />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── UiButton ──────────────────────────────────────────────────────────────

export const UiButtonVariants: StoryObj = {
  name: 'UiButton / Variants',
  render: () => ({
    components: { UiButton },
    setup() {
      return { onClick: fn() };
    },
    template: `
      <div class="flex max-w-[450px] flex-col gap-4">
        <div class="flex gap-2">
          <UiButton variant="secondary" block @click="onClick">Скасувати</UiButton>
          <UiButton variant="primary" block @click="onClick">Зберегти</UiButton>
        </div>
        <UiButton variant="primary" :loading="true" block loading-label="Збереження…" />
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

/**
 * The kit matrix — Figma 3333:5860. Four styles x three sizes; Hovered is a
 * pointer state and Disabled is the last column. Storybook is not acceptance
 * (AGENTS section 2.4 wants prod) — this is the reference sheet for the next
 * phases, which move the remaining call sites onto this recipe.
 */
export const UiButtonKitMatrix: StoryObj = {
  name: 'UiButton / Kit matrix (3333:5860)',
  render: () => ({
    components: { UiButton, CornerUpLeftIcon },
    setup() {
      return {
        onClick: fn(),
        variants: ['primary', 'secondary', 'neutral', 'ghost'] as const,
        sizes: ['L', 'M', 'S'] as const,
      };
    },
    template: `
      <div class="flex flex-col gap-6">
        <div v-for="variant in variants" :key="variant" class="flex flex-col gap-2">
          <p class="text-sm/4 font-medium text-ink-700">{{ variant }}</p>
          <div v-for="size in sizes" :key="size" class="flex items-center gap-3">
            <UiButton kit :variant="variant" :size="size" @click="onClick">Label</UiButton>
            <UiButton kit :variant="variant" :size="size" disabled>Disabled</UiButton>
            <UiButton kit :variant="variant" :size="size" @click="onClick">
              <template #icon-left="{ iconClass }">
                <CornerUpLeftIcon :class="iconClass" />
              </template>
              Icon
            </UiButton>
          </div>
        </div>
      </div>
    `,
  }),
  parameters: { cardWidth: 640 },
};

// ─── ConfirmationModal ─────────────────────────────────────────────────────

export const ConfirmationModalDefault: StoryObj = {
  name: 'ConfirmationModal / Default',
  render: () => ({
    components: { ConfirmationModal },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: `
      <ConfirmationModal
        title="Застосувати варіант CEO?"
        body="Ці назви прив'язані до іншого концепту. Разом із ними буде застосовано концепт обраний СЕО."
        cancel-label="Скасувати"
        primary-label="Застосувати все"
        @cancel="onCancel"
        @primary="onPrimary"
      />
    `,
  }),
};

export const ConfirmationModalLoading: StoryObj = {
  name: 'ConfirmationModal / Primary Loading',
  render: () => ({
    components: { ConfirmationModal },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: `
      <ConfirmationModal
        title="Застосувати варіант CEO?"
        body="Зачекайте, обробляємо запит..."
        primary-label="Застосувати все"
        :primary-loading="true"
        @cancel="onCancel"
        @primary="onPrimary"
      />
    `,
  }),
};

export const ConfirmationModalStacked: StoryObj = {
  name: 'ConfirmationModal / Stacked (BRIEF-038 warning)',
  render: () => ({
    components: { ConfirmationModal },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: `
      <ConfirmationModal
        title="Ви внесли зміни до брифу"
        body="Ви змінили вибір концепту або неймінгу.
За потреби поверніть бриф на доопрацювання перед затвердженням."
        cancel-label="Повернути на доопрацювання"
        primary-label="Затвердити бриф"
        actions-layout="stack"
        @cancel="onCancel"
        @primary="onPrimary"
      />
    `,
  }),
};

// ─── SegmentedControl ──────────────────────────────────────────────────────

export const SegmentedControlExample: StoryObj = {
  name: 'SegmentedControl',
  render: () => ({
    components: { SegmentedControl },
    setup() {
      const mode = ref<'light' | 'dark'>('light');
      const options = [
        { value: 'light', label: 'Світла тема' },
        { value: 'dark', label: 'Темна тема' },
      ];
      return { mode, options };
    },
    template: '<SegmentedControl v-model="mode" :options="options" />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── EditFlowFooter ────────────────────────────────────────────────────────

export const EditFlowFooterDefault: StoryObj = {
  name: 'EditFlowFooter / Default',
  render: () => ({
    components: { EditFlowFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: '<EditFlowFooter @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

export const EditFlowFooterDisabled: StoryObj = {
  name: 'EditFlowFooter / Primary Disabled',
  render: () => ({
    components: { EditFlowFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template:
      '<EditFlowFooter primary-label="Зберегти" :primary-disabled="true" @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

export const EditFlowFooterLoading: StoryObj = {
  name: 'EditFlowFooter / Loading',
  render: () => ({
    components: { EditFlowFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: '<EditFlowFooter :loading="true" @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── Atom badges ──────────────────────────────────────────────────────────

export const SectionStatusBadgeAttention: StoryObj = {
  name: 'SectionStatusBadge / Attention',
  render: () => ({
    components: { SectionStatusBadge },
    template: '<SectionStatusBadge variant="attention" />',
  }),
  parameters: { cardWidth: 520 },
};

export const StatusPillBadgeVariants: StoryObj = {
  name: 'StatusPillBadge / All tones',
  render: () => ({
    components: { StatusPillBadge, BrandBriefStatusBadge },
    template: `
      <div class="flex flex-col items-start gap-3">
        <BrandBriefStatusBadge status="submitted" />
        <BrandBriefStatusBadge status="needs_revision" />
        <BrandBriefStatusBadge status="approved" />
        <StatusPillBadge label="Потрібно обрати варіант" tone="section-attention" />
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const UnresolvedDotExample: StoryObj = {
  name: 'UnresolvedDot',
  render: () => ({
    components: { UnresolvedDot },
    template:
      '<div class="flex items-center gap-2 text-sm text-[#0a0a0a]"><span>Brand Basics</span><UnresolvedDot /></div>',
  }),
  parameters: { cardWidth: 520 },
};
