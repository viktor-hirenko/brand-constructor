import type { Meta, StoryObj } from '@storybook/vue3';
import { fn } from '@storybook/test';
import { ref } from 'vue';
import ReviewDeliverablesBlock from '@/components/constructor/review/ReviewDeliverablesBlock.vue';
import ReviewVisualComponentsBlock from '@/components/constructor/review/ReviewVisualComponentsBlock.vue';
import ReviewInternalNamingBlock from '@/components/constructor/review/ReviewInternalNamingBlock.vue';
import ApplyCeoVariantButton from '@/components/constructor/review/ApplyCeoVariantButton.vue';
import SimpleModal from '@/components/ui/SimpleModal.vue';
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

// ─── SimpleModal ───────────────────────────────────────────────────────────

export const SimpleModalDefault: StoryObj = {
  name: 'SimpleModal / Default',
  render: () => ({
    components: { SimpleModal },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: `
      <SimpleModal
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

export const SimpleModalLoading: StoryObj = {
  name: 'SimpleModal / Primary Loading',
  render: () => ({
    components: { SimpleModal },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: `
      <SimpleModal
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
