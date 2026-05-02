<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'

interface ReviewConceptBlockProps {
  concept: Concept | null
  /** "light" | "dark" — drives the Mode row label/icon. */
  mode: 'light' | 'dark' | null
  /** When true and `concept` is null, show "Новий концепт (бриф)" placeholder. */
  isNewConcept?: boolean
}

const props = withDefaults(defineProps<ReviewConceptBlockProps>(), {
  isNewConcept: false,
})

const emit = defineEmits<{
  preview: []
}>()

const previewUrl = computed(() => {
  const url = props.concept?.gallery_url_1 || props.concept?.visual_url
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})

const conceptName = computed(() => {
  if (props.concept) return props.concept.name
  if (props.isNewConcept) return 'Новий концепт (бриф)'
  return null
})

const modeLabel = computed(() => (props.mode === 'dark' ? 'Dark' : 'Light'))
</script>

<template>
  <div class="space-y-4">
    <!-- Mode row -->
    <div class="flex items-start gap-7">
      <div class="size-5 shrink-0 mt-1 text-muted-foreground">
        <svg
          v-if="mode === 'dark'"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <svg
          v-else
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-muted-foreground leading-4 mb-1">Mode</p>
        <p class="text-base text-foreground tracking-[-0.31px]">{{ modeLabel }}</p>
      </div>
    </div>

    <!-- Concept selection: image with name overlay + eye button -->
    <div>
      <p class="text-xs text-muted-foreground leading-4 mb-2">Вибір Замовника</p>
      <div v-if="concept && previewUrl" class="relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-muted">
        <img
          :src="previewUrl"
          :alt="concept.name"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div
          class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent"
        >
          <p class="text-base font-medium text-white tracking-[-0.31px]">{{ concept.name }}</p>
        </div>
        <button
          type="button"
          class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors"
          aria-label="Переглянути концепт"
          @click="emit('preview')"
        >
          <svg
            class="size-4 text-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <div
        v-else-if="conceptName"
        class="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-sm text-muted-foreground"
      >
        {{ conceptName }}
      </div>
      <div v-else class="text-sm text-muted-foreground italic">Концепт не обрано</div>
    </div>
  </div>
</template>
