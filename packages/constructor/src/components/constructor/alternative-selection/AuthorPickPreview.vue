<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types'
import { computed } from 'vue'
import ConceptCard from '@/components/constructor/alternative-selection/ConceptCard.vue'

interface AuthorPickPreviewProps {
  concept: Concept | null
}

const props = defineProps<AuthorPickPreviewProps>()

const previewUrl = computed(() => {
  const url = props.concept?.visual_url || props.concept?.gallery_url_1
  return url && url.trim() !== '' ? url : null
})
</script>

<template>
  <div class="author-pick-preview flex flex-col gap-3">
    <p class="author-pick-preview__label text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
      Вибір замовника
    </p>
    <div v-if="concept && previewUrl" class="author-pick-preview__card w-[162px] shrink-0">
      <!-- Reference-only card: same dim overlay + title gradient as other edit-flow cards. -->
      <ConceptCard :concept="concept" :show-overlay="true" :clickable="false" />
    </div>
    <p
      v-else
      class="author-pick-preview__empty text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Концепт не обрано
    </p>
  </div>
</template>
