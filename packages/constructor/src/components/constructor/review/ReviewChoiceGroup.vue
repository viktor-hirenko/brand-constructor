<script setup lang="ts">
/**
 * Layout shell for PO / CEO / applied choice blocks in review screens.
 * Business content is passed via slots; this component only renders labels and structure.
 */
type ReviewChoiceLayout = 'applied' | 'dual' | 'single'

interface ReviewChoiceGroupProps {
  layout: ReviewChoiceLayout
  poLabel?: string
  ceoLabel?: string
  appliedLabel?: string
  /** Side-by-side grid for concept image cards. */
  dualGrid?: boolean
  /** Gap between dual columns / actions stack. */
  dualOuterGap?: string
  /** Gap between label and content inside a column. */
  columnInnerGap?: string
  /** Gap on applied / single choice wrappers. */
  choiceGap?: string
}

withDefaults(defineProps<ReviewChoiceGroupProps>(), {
  poLabel: 'Вибір замовника',
  ceoLabel: 'Вибір CEO',
  appliedLabel: 'Обрані назви',
  dualGrid: false,
  dualOuterGap: 'gap-6',
  columnInnerGap: 'gap-1',
  choiceGap: 'gap-2',
})
</script>

<template>
  <div
    :class="[
      'review-choice-group',
      layout === 'applied' ? 'review-choice-group--applied' : '',
      layout === 'dual' ? 'review-choice-group--dual-view' : '',
      layout === 'single' ? 'review-choice-group--single' : '',
    ]"
  >
    <!-- Applied -->
    <div
      v-if="layout === 'applied'"
      :class="[
        'review-choice-group__choice review-choice-group__choice--applied flex flex-col',
        choiceGap,
      ]"
    >
      <p class="review-choice-group__label text-[14px] font-medium leading-4 text-[#5B5B62]">
        {{ appliedLabel }}
      </p>
      <slot name="applied" />
    </div>

    <!-- Dual: PO + CEO (+ optional actions) -->
    <template v-else-if="layout === 'dual'">
      <div
        :class="[
          dualGrid
            ? 'review-choice-group__choice review-choice-group__choice--dual grid grid-cols-2 gap-3 max-w-[506px]'
            : ['review-choice-group__choice review-choice-group__choice--dual flex flex-col', dualOuterGap],
        ]"
      >
        <div
          :class="[
            'review-choice-group__column review-choice-group__column--po flex flex-col min-w-0',
            columnInnerGap,
          ]"
        >
          <p class="review-choice-group__label text-[14px] font-medium leading-4 text-[#5B5B62]">
            {{ poLabel }}
          </p>
          <slot name="po" />
        </div>
        <div
          :class="[
            'review-choice-group__column review-choice-group__column--ceo flex flex-col min-w-0',
            columnInnerGap,
          ]"
        >
          <p class="review-choice-group__label text-[14px] font-medium leading-4 text-[#5B5B62]">
            {{ ceoLabel }}
          </p>
          <slot name="ceo" />
        </div>
      </div>
      <div v-if="$slots.actions" class="review-choice-group__actions">
        <slot name="actions" />
      </div>
    </template>

    <!-- Single: PO only -->
    <div
      v-else
      :class="[
        'review-choice-group__choice review-choice-group__choice--single flex flex-col',
        choiceGap,
      ]"
    >
      <p class="review-choice-group__label text-[14px] font-medium leading-4 text-[#5B5B62]">
        {{ poLabel }}
      </p>
      <slot name="single" />
    </div>
  </div>
</template>
