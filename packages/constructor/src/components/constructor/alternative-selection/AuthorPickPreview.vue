<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types'
import { computed } from 'vue'
import ConceptCard from '@/components/constructor/alternative-selection/ConceptCard.vue'

interface AuthorPickPreviewProps {
  concept: Concept | null
  /** When true, the PO card can be selected as the CEO's confirmed pick. */
  selectable?: boolean
  /** Highlights the PO card when it matches the staged CEO selection. */
  selected?: boolean
  /** Highlights the PO card when it drives the right-panel preview. */
  previewed?: boolean
}

const props = withDefaults(defineProps<AuthorPickPreviewProps>(), {
  selectable: false,
  selected: false,
  previewed: false,
})

const emit = defineEmits<{
  preview: []
  select: []
}>()

const previewUrl = computed(() => {
  const url = props.concept?.visual_url || props.concept?.gallery_url_1
  return url && url.trim() !== '' ? url : null
})

function handleClick() {
  if (!props.selectable || !props.concept) return
  emit('preview')
  emit('select')
}
</script>

<template>
  <div class="author-pick-preview flex flex-col gap-3">
    <p class="author-pick-preview__label text-[1rem] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
      Вибір замовника
    </p>
    <div v-if="concept && previewUrl" class="author-pick-preview__card w-[162px] shrink-0">
      <ConceptCard
        :concept="concept"
        :show-overlay="true"
        :clickable="selectable"
        :is-selected="selected"
        :is-active="selected || previewed"
        :show-selection-ring="selectable && selected"
        :show-checkmark="selectable && selected"
        @click="handleClick"
      />
    </div>
    <p
      v-else
      class="author-pick-preview__empty text-[1rem] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Концепт не обрано
    </p>
  </div>
</template>
