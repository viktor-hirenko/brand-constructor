<script setup lang="ts">
/**
 * Step 8 (review) preview. Renders the phone with `PhonePreviewCanvas` — the
 * same component step 7 uses — so the reviewer and the author look at one
 * implementation instead of two that drift apart.
 *
 * Two phones side by side: the screen as the player first sees it, and the same
 * screen with the sidebar open. Step 7 folds those into one phone plus a toggle
 * because it is an editing screen; a review screen shows both at once.
 */

import { computed, onMounted, watch } from 'vue'
import { useBrandPreviewLayers, type PreviewSlice } from '@/composables/useBrandPreviewLayers'
import { useConstructorStore } from '@/stores/constructor'
import { MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS } from '@/constants/previewLayout'
import PhonePreviewCanvas from '@/components/constructor/preview/PhonePreviewCanvas.vue'
import PhonePreviewSidebar from '@/components/constructor/preview/PhonePreviewSidebar.vue'
import PhonePreviewSlice from '@/components/constructor/preview/PhonePreviewSlice.vue'
import VisualComponentsPhoneEmptyState from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'

const store = useConstructorStore()
const { loadVariants, buildComposition, getOverlaySlice } = useBrandPreviewLayers()

const isDelegated = computed(() => store.stepData.visualComponents.delegateToDesigners)

const composition = computed(() => buildComposition(false))

interface ReviewPhone {
  key: string
  sidebar: PreviewSlice | null
}

const phones = computed((): ReviewPhone[] => [
  { key: 'screen', sidebar: null },
  { key: 'sidebar', sidebar: getOverlaySlice() },
])

onMounted(loadVariants)

watch(() => Object.keys(store.stepData?.visualComponents?.selections ?? {}).join(','), loadVariants)
</script>

<template>
  <aside
    :class="['relative w-full h-full flex flex-col overflow-y-auto bg-white', MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS]"
  >
    <header class="space-y-1">
      <h2
        class="text-lg font-medium tracking-[-0.45px] text-foreground inline-flex items-center gap-2"
      >
        <SparklesIcon class="size-6 shrink-0 text-[#5B5B62]" />
        <span class="text-[1.25rem]">Превʼю</span>
      </h2>
    </header>

    <!-- Delegated: single phone carrying the empty state, as on step 7. -->
    <div v-if="isDelegated" class="flex flex-1 min-h-0 w-full items-center justify-center">
      <PhonePreviewCanvas>
        <template #body>
          <VisualComponentsPhoneEmptyState variant="delegated" />
        </template>
      </PhonePreviewCanvas>
    </div>

    <!-- Normal: the screen, and the screen with the sidebar open.
         Dual phones gap 40px → 2.5rem @16. -->
    <div
      v-else
      class="brand-preview-panel__dual-phones flex items-start justify-center gap-[2.5rem] flex-1 min-h-0"
    >
      <PhonePreviewCanvas v-for="phone in phones" :key="phone.key">
        <template v-if="composition.top" #top>
          <PhonePreviewSlice :slice="composition.top" />
        </template>

        <template #body>
          <PhonePreviewSlice
            v-for="slice in composition.body"
            :key="slice.typeId"
            :slice="slice"
          />
        </template>

        <template v-if="composition.bottom" #bottom>
          <PhonePreviewSlice :slice="composition.bottom" />
        </template>

        <template v-if="phone.sidebar" #overlay="{ unitRem }">
          <PhonePreviewSidebar :slice="phone.sidebar" :unit-rem="unitRem" />
        </template>
      </PhonePreviewCanvas>
    </div>
  </aside>
</template>
