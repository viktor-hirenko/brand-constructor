<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import { computed } from 'vue'
import { CONCEPT_CARD_TITLE_GRADIENT } from '@/constants/conceptCardVisual'

interface CustomerPickPreviewProps {
  concept: Concept | null
}

const props = defineProps<CustomerPickPreviewProps>()

const previewUrl = computed(() => {
  const url = props.concept?.visual_url || props.concept?.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})
</script>

<template>
  <div class="customer-pick-preview flex flex-col gap-3">
    <p class="customer-pick-preview__label text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
      Вибір замовника
    </p>
    <div
      v-if="concept && previewUrl"
      class="customer-pick-preview__image-wrapper relative w-[162px] h-[162px] rounded-2xl overflow-hidden bg-muted shrink-0"
    >
      <img
        :src="previewUrl"
        :alt="concept.name"
        class="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div
        class="absolute inset-x-0 bottom-0 px-3 pt-8 pb-3"
        :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
      >
        <p class="text-[18px] font-medium leading-5 text-white truncate">
          {{ concept.name }}
        </p>
      </div>
    </div>
    <p
      v-else
      class="customer-pick-preview__empty text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Концепт не обрано
    </p>
  </div>
</template>
