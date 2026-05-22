<script setup lang="ts">
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import { useConstructorStore } from '@/stores/constructor'
import { useEscapeClose } from '@/composables/useEscapeClose'
import type { Concept } from '@brand-constructor/shared/types'
import CloseIcon from '@/components/icons/CloseIcon.vue'

interface ConceptPreviewPopupProps {
  concept: Concept | null
}

defineProps<ConceptPreviewPopupProps>()

const store = useConstructorStore()

function handleClose() {
  store.closeConceptPreview()
}

useEscapeClose(handleClose)
</script>

<template>
  <div
    v-if="concept"
    class="flex flex-col h-full w-full bg-white px-6 pt-6 pb-6 gap-6"
    role="dialog"
    aria-modal="true"
    :aria-label="`Перегляд концепту ${concept.name}`"
  >
    <header class="flex items-center justify-between gap-4 shrink-0">
      <h2
        class="text-[24px] font-medium leading-8 tracking-[-0.4492px] text-[#0a0a0a] truncate"
      >
        {{ concept.name }}
      </h2>
      <button
        type="button"
        class="inline-flex items-center justify-center size-12 shrink-0 rounded-full bg-[#f9f9fb] text-[#141B34] hover:bg-[#ececf0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8c7cc]"
        aria-label="Закрити"
        @click="handleClose"
      >
        <CloseIcon class="size-6" :stroke-width="1.5" />
      </button>
    </header>

    <div class="flex-1 min-h-0 overflow-hidden">
      <ConceptPreviewSlider :concept="concept" :is-final-selected="false" hide-header />
    </div>
  </div>
</template>
