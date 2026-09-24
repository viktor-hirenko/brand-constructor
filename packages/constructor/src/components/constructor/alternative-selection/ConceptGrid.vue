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
    Kit card size by breakpoint — `--wizard-concept-card-min` in `app.css`:
    1280 `5395:119372` 3×133, 1440 `5395:118745` 4×125.75, 1920 `5395:119192`
    5×156.6, 2560 `5395:119545` 5×140.

    `auto-fill` with her card as the MINIMUM, not a fixed column count. The
    count reproduces her four frames exactly, and between them a column is
    added as soon as one fits instead of the cards stretching on and on — at a
    660-wide container four cards had grown to 159 while a fifth already fits
    at 680. One size for all four breakpoints does not exist (1440 needs
    ≤125.75, 1920 needs >129.17), which is why the minimum is a variable.
    Divergence row 53. The skeleton reads the same variable and must never
    diverge from this line.
  -->
  <div class="concept-grid grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(var(--wizard-concept-card-min),1fr))]">
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
