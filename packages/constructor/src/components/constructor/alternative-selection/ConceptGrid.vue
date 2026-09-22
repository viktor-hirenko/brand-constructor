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
  <!-- Card min width 144px → 9rem @16; auto-fill adds columns on wide panels. -->
  <div class="concept-grid grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(9rem,100%),1fr))]">
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
