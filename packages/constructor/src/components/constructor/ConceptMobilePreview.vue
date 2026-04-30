<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'

const props = defineProps<{
  concept: Concept | null
}>()

const mobileSrc = computed(() => {
  const c = props.concept
  if (!c) return null
  const url = c.gallery_url_2 || c.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})
</script>

<template>
  <div class="flex flex-col gap-6 h-full">
    <h3 class="text-[24px] font-medium tracking-[-0.4492px] leading-8 text-[#0a0a0a] shrink-0">
      Обраний концепт
    </h3>

    <div
      v-if="!concept"
      class="flex-1 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-black/10 bg-muted/20 p-8 text-center text-muted-foreground min-h-[400px]"
    >
      <p class="text-sm tracking-[-0.15px]">Спочатку оберіть концепт</p>
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
        Немає мобільного превʼю (gallery_url_2)
      </div>
    </div>
  </div>
</template>
