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
  <div class="concept-grid grid grid-cols-3 gap-2 max-w-[506px]">
    <ConceptCard
      v-for="concept in concepts"
      :key="concept.id"
      :concept="concept"
      :is-selected="isSelected(concept.id)"
      :is-active="isActive(concept.id)"
      :show-selection-ring="selectionRing && isSelected(concept.id)"
      :show-checkmark="isSelected(concept.id)"
      :show-overlay="true"
      :disabled="disabled"
      :clickable="!disabled"
      @click="emit('select', concept.id)"
    />
  </div>
</template>
