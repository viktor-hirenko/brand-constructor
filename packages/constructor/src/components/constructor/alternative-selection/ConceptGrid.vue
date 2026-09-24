<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types'
import ConceptCard from './ConceptCard.vue'

interface ConceptGridProps {
  concepts: Concept[]
  /** Currently previewed concept (drives border + removes dimming). */
  previewId?: string | null
  /** Confirmed CEO concept (in addition to border, shows checkmark). */
  selectedId: string | null
  disabled?: boolean
  /** Show animated white inner border ring when a card is selected. */
  selectionRing?: boolean
}

const props = withDefaults(defineProps<ConceptGridProps>(), {
  disabled: false,
  previewId: null,
  selectionRing: false,
})

const emit = defineEmits<{
  select: [conceptId: string]
}>()

function isActive(id: string): boolean {
  return props.previewId === id || props.selectedId === id
}

function isSelected(id: string): boolean {
  return props.selectedId === id
}
</script>

<template>
  <!--
    Kit column count — 3 / 4 / 5 by breakpoint, `--wizard-concept-columns` in
    `app.css`. Measured on the four responsive frames: 1280 `5395:119372` is
    3×133, 1440 `5395:118745` is 4×125.75, 1920 `5395:119192` is 5×156.6, 2560
    `5395:119545` is 5×140. The card gets SMALLER as the count grows, so the
    driver is the viewport and the old `auto-fill minmax(9rem)` formula — which
    only ever produced 3 — cannot express it. `minmax(0,1fr)` keeps the
    overflow protection that `min(…,100%)` used to give. Divergence row 53.
    The skeleton reads the same variable and must never diverge from this line.
  -->
  <div class="concept-grid grid gap-2 [grid-template-columns:repeat(var(--wizard-concept-columns),minmax(0,1fr))]">
    <ConceptCard
      v-for="concept in concepts"
      :key="concept.id"
      :concept="concept"
      :is-selected="isSelected(concept.id)"
      :is-active="isActive(concept.id)"
      :show-selection-ring="selectionRing && isSelected(concept.id)"
      :show-checkmark="isSelected(concept.id)"
      :show-preview-mark="isActive(concept.id) && !isSelected(concept.id)"
      :show-overlay="true"
      :disabled="disabled"
      :clickable="!disabled"
      @click="emit('select', concept.id)"
    />
  </div>
</template>
