<script setup lang="ts">
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import { useConstructorStore } from '@/stores/constructor'
import { useEscapeClose } from '@/composables/useEscapeClose'
import type { Concept } from '@brand-constructor/shared/types'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

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
        class="text-[1.5rem] font-medium leading-8 text-ink-900 truncate"
      >
        {{ concept.name }}
      </h2>
      <!-- Kit icon button `3333:5541`, Solid L-48. This popup has no `UiModal`
           header, so the control keeps button chrome rather than the bare 24
           glyph the kit uses inside a modal header. -->
      <UiIconButton aria-label="Закрити" @click="handleClose">
        <template #default="{ iconClass }">
          <CloseIcon :class="iconClass" />
        </template>
      </UiIconButton>
    </header>

    <div class="flex-1 min-h-0 overflow-hidden">
      <ConceptPreviewSlider :concept="concept" hide-header />
    </div>
  </div>
</template>
