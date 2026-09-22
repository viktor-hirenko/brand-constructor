<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'

interface ConceptMobilePreviewProps {
  concept: Concept | null
  /**
   * Empty panel copy when `concept` is null.
   * `ordered-concept` — PO ordered a new concept brief (no grid pick yet).
   */
  emptyMode?: 'select-first' | 'ordered-concept'
}

const props = withDefaults(defineProps<ConceptMobilePreviewProps>(), {
  emptyMode: 'select-first',
})

const emptyMessage = computed(() =>
  props.emptyMode === 'ordered-concept'
    ? 'Для замовленого концепту превʼю поки недоступне.'
    : 'Спочатку оберіть концепт',
)

/** Admin: gallery_url_1 = "Gallery Image 1 (Mobile Preview)" — same as CEO reselect naming step. */
const mobileSrc = computed(() => {
  const c = props.concept
  if (!c) return null
  const url = c.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})
</script>

<template>
  <div class="flex flex-col gap-6 h-full">
    <h3 class="py-2 text-[1.5rem] font-medium leading-8 text-ink-900 shrink-0">
      Обраний концепт
    </h3>

    <div
      v-if="!concept"
      class="flex-1 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] p-8 text-center min-h-[400px]"
    >
      <ImagePlaceholderIcon class="size-10 mb-6 text-[#c8c8c8]" />
      <p class="text-[1rem] leading-6 tracking-[-0.3125px] text-[#717182] max-w-[280px]">
        {{ emptyMessage }}
      </p>
    </div>

    <div v-else class="w-full aspect-square rounded-[24px] overflow-hidden bg-muted/30 flex-1">
      <img
        v-if="mobileSrc"
        :src="mobileSrc"
        :alt="concept.name || 'Mobile preview'"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center"
      >
        Немає мобільного превʼю (gallery_url_1)
      </div>
    </div>
  </div>
</template>
