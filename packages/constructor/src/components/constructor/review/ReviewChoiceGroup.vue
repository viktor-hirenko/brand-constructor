<script setup lang="ts">
/**
 * Layout shell for PO / CEO / applied choice blocks in review screens.
 * Business content is passed via slots; this component only renders labels and structure.
 *
 * Each column is the kit's Property in its label-first form — `Label + Value`
 * (`4378:8011`) for the naming lists, `Label + Preview` (`4131:8340`) for the
 * concept cards — so the caption is `UiProperty`'s label and the gap under it
 * is the kit's `spacing/8`. DP-15258 phase 13 measured both symbols: the
 * label-first types put 8 there, while `Icon + Label + Value` puts 4. The
 * screen carried 4 in three of these five places and 8 in the other two.
 */
import UiProperty from '@/components/ui/UiProperty.vue'

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
}

withDefaults(defineProps<ReviewChoiceGroupProps>(), {
  poLabel: 'Вибір замовника',
  ceoLabel: 'Вибір CEO',
  appliedLabel: 'Обрані назви',
  dualGrid: false,
  // 16 between «Вибір замовника» and «Вибір CEO» — `5387:105225` External
  // Naming property list. Was 24.
  dualOuterGap: 'gap-4',
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
    <UiProperty
      v-if="layout === 'applied'"
      class="review-choice-group__choice review-choice-group__choice--applied"
      type="label-value"
      :label="appliedLabel"
    >
      <slot name="applied" />
    </UiProperty>

    <!-- Dual: PO + CEO (+ optional actions). Max width 506px → 31.625rem @16. -->
    <template v-else-if="layout === 'dual'">
      <div
        :class="[
          dualGrid
            ? 'review-choice-group__choice review-choice-group__choice--dual grid grid-cols-2 gap-2 max-w-[31.625rem]'
            : ['review-choice-group__choice review-choice-group__choice--dual flex flex-col', dualOuterGap],
        ]"
      >
        <UiProperty
          class="review-choice-group__column review-choice-group__column--po"
          :type="dualGrid ? 'label-preview' : 'label-value'"
          :label="poLabel"
        >
          <slot name="po" />
        </UiProperty>
        <UiProperty
          class="review-choice-group__column review-choice-group__column--ceo"
          :type="dualGrid ? 'label-preview' : 'label-value'"
          :label="ceoLabel"
        >
          <slot name="ceo" />
        </UiProperty>
      </div>
      <div v-if="$slots.actions" class="review-choice-group__actions mt-4">
        <slot name="actions" />
      </div>
    </template>

    <!-- Single: PO only -->
    <UiProperty
      v-else
      class="review-choice-group__choice review-choice-group__choice--single"
      type="label-value"
      :label="poLabel"
    >
      <slot name="single" />
    </UiProperty>
  </div>
</template>
