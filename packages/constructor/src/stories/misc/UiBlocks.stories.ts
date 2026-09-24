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
import UiFooter from '@/components/ui/UiFooter.vue';
import SectionStatusBadge from '@/components/ui/SectionStatusBadge.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiStatusDot from '@/components/ui/UiStatusDot.vue';
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue';
import StatusPillBadge from '@/components/ui/StatusPillBadge.vue';
import BrandBriefStatusBadge from '@/components/constructor/review/BrandBriefStatusBadge.vue';
import UnresolvedDot from '@/components/ui/UnresolvedDot.vue';
import UiStepHeader from '@/components/ui/UiStepHeader.vue';
import UiProgressBar from '@/components/ui/UiProgressBar.vue';
import UiDivider from '@/components/ui/UiDivider.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiAsyncState from '@/components/ui/UiAsyncState.vue';
import UiModal from '@/components/ui/UiModal.vue';

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

// ─── UiFooter ──────────────────────────────────────────────────────────────

export const UiFooterBar: StoryObj = {
  name: 'UiFooter / Bar',
  render: () => ({
    components: { UiFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: '<UiFooter @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

export const UiFooterBarDisabled: StoryObj = {
  name: 'UiFooter / Bar, primary disabled',
  render: () => ({
    components: { UiFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template:
      '<UiFooter primary-label="Зберегти" :primary-disabled="true" @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

export const UiFooterBarLoading: StoryObj = {
  name: 'UiFooter / Bar, loading',
  render: () => ({
    components: { UiFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template: '<UiFooter :loading="true" @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

export const UiFooterStack: StoryObj = {
  name: 'UiFooter / Stack (review actions)',
  render: () => ({
    components: { UiFooter },
    setup() {
      return { onCancel: fn(), onPrimary: fn() };
    },
    template:
      '<UiFooter layout="stack" primary-label="На погодження CEO" cancel-label="Назад" @cancel="onCancel" @primary="onPrimary" />',
  }),
  parameters: { cardWidth: 520 },
};

// ─── Atom badges ──────────────────────────────────────────────────────────

export const UiBadgeTones: StoryObj = {
  name: 'UiBadge / Six kit tones',
  render: () => ({
    components: { UiBadge },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <UiBadge tone="neutral" label="Neutral" />
        <UiBadge tone="green" label="Available" />
        <UiBadge tone="amber" label="Потрібно доопрацювати" />
        <UiBadge tone="red" label="Sold" />
        <UiBadge tone="blue" label="На розгляді" />
        <UiBadge tone="purple" label="Purple" />
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const UiBadgeWithIcons: StoryObj = {
  name: 'UiBadge / Icon slots',
  render: () => ({
    components: { UiBadge, InfoCircleFilledIcon },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <UiBadge tone="amber" label="Type C">
          <template #leading><InfoCircleFilledIcon class="size-4 shrink-0" /></template>
        </UiBadge>
        <UiBadge tone="neutral" label="UA">
          <template #trailing><InfoCircleFilledIcon class="size-4 shrink-0" /></template>
        </UiBadge>
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const UiStatusDotExample: StoryObj = {
  name: 'UiStatusDot / 6×6 info dot',
  render: () => ({
    components: { UiStatusDot },
    template:
      '<div class="flex items-center gap-2 text-sm text-ink-900"><span>Brand Basics</span><UiStatusDot /></div>',
  }),
  parameters: { cardWidth: 520 },
};

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

// ─── Step header, progress bar, divider — Figma 3984:8226 / 3889:2849 / 3446:5230 ──

export const StepHeaderFull: StoryObj = {
  name: 'UiStepHeader / Title + badge + description + alert',
  render: () => ({
    components: { UiStepHeader, BrandBriefStatusBadge, UiAlert },
    template: `
      <UiStepHeader
        title="Зовнішній неймінг"
        description="Оберіть до трьох доменних імен для бренду."
      >
        <template #badge><BrandBriefStatusBadge status="submitted" /></template>
        <template #alert>
          <UiAlert
            type="info"
            title="Домени перевіряються"
            description="Статус доступності оновиться протягом хвилини."
          />
        </template>
      </UiStepHeader>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const StepHeaderPlain: StoryObj = {
  name: 'UiStepHeader / Title + description only (edit flow)',
  render: () => ({
    components: { UiStepHeader },
    template: `
      <UiStepHeader
        title="Оберіть інший концепт"
        description="Замовник запропонував концепт, який вам не підійшов."
      />
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const ProgressBarSteps: StoryObj = {
  name: 'UiProgressBar / Steps 1, 4 and 8',
  render: () => ({
    components: { UiProgressBar },
    template: `
      <div class="flex flex-col gap-6">
        <UiProgressBar :percent="13" label="Крок 1 з 8" />
        <UiProgressBar :percent="50" label="Крок 4 з 8" />
        <UiProgressBar :percent="100" label="Крок 8 з 8" />
        <UiProgressBar :percent="50" />
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const DividerOrientations: StoryObj = {
  name: 'UiDivider / Horizontal and vertical',
  render: () => ({
    components: { UiDivider },
    template: `
      <div class="flex flex-col gap-6">
        <UiDivider />
        <div class="flex h-10 items-center gap-4 text-sm text-ink-700">
          <span>Ліворуч</span>
          <UiDivider orientation="vertical" />
          <span>Праворуч</span>
        </div>
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const AlertTypes: StoryObj = {
  name: 'UiAlert / All five kit types',
  render: () => ({
    components: { UiAlert },
    template: `
      <div class="flex flex-col gap-4">
        <UiAlert title="Default" description="Нейтральна картка без семантичного тону." />
        <UiAlert type="info" title="Info" description="Статус оновиться протягом хвилини." />
        <UiAlert type="success" title="Success" description="Бриф надіслано на розгляд." />
        <UiAlert type="warning" title="Warning" description="Додайте хоча б один коментар." />
        <UiAlert type="error" title="Error" description="Не вдалося завантажити дані." />
      </div>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const AlertWithActions: StoryObj = {
  name: 'UiAlert / With an action row',
  render: () => ({
    components: { UiAlert, UiButton },
    template: `
      <UiAlert
        type="warning"
        title="Бриф повернуто на доопрацювання"
        description="Замовник залишив три коментарі, на які потрібно відповісти."
      >
        <template #actions>
          <UiButton kit variant="secondary" size="S">Переглянути</UiButton>
          <UiButton kit variant="ghost" size="S">Пізніше</UiButton>
        </template>
      </UiAlert>
    `,
  }),
  parameters: { cardWidth: 520 },
};

export const AsyncStateFailure: StoryObj = {
  name: 'UiAsyncState / Failed to load',
  render: () => ({
    components: { UiAsyncState },
    setup: () => ({ onRetry: fn() }),
    template: `
      <UiAsyncState
        message="Request failed with status code 500"
        @retry="onRetry"
      />
    `,
  }),
  parameters: { cardWidth: 520 },
};

// ─── UiModal ───────────────────────────────────────────────────────────────
// The one modal shell (DP-15258 phase 6). A story is the only way to look at a
// modal without walking the wizard to the step that opens it.

export const ModalWithFooter: StoryObj = {
  name: 'UiModal / Form modal with footer',
  render: () => ({
    components: { UiModal, UiButton },
    setup: () => ({ onClose: fn() }),
    template: `
      <UiModal title="Замовити новий концепт" size="md" @close="onClose">
        <div class="flex flex-col gap-4">
          <p class="text-base text-ink-700">
            Тіло модалки прокручується саме, коли вміст вищий за 85% екрана.
          </p>
          <div v-for="n in 12" :key="n" class="rounded-lg bg-ink-200 p-4 text-sm/4 text-ink-800">
            Рядок форми {{ n }}
          </div>
        </div>
        <template #footer>
          <UiButton kit size="L" variant="secondary">Скасувати</UiButton>
          <UiButton kit size="L" variant="primary">Зберегти</UiButton>
        </template>
      </UiModal>
    `,
  }),
};

export const ModalWithoutFooter: StoryObj = {
  name: 'UiModal / Detail modal, no footer',
  render: () => ({
    components: { UiModal, UiButton },
    setup: () => ({ onClose: fn() }),
    template: `
      <UiModal title="PR Boost" size="md" @close="onClose">
        <div class="flex flex-col gap-6">
          <p class="text-base text-ink-700">Опис пакета одним абзацом.</p>
          <UiButton kit size="L" variant="primary" block>Обрати пакет</UiButton>
        </div>
      </UiModal>
    `,
  }),
};
