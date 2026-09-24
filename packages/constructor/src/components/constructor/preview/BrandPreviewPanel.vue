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

import { computed, inject, onMounted, watch } from 'vue'
import { useBrandPreviewLayers, type PreviewSlice } from '@/composables/useBrandPreviewLayers'
import { useConstructorStore } from '@/stores/constructor'
import { MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS } from '@/constants/previewLayout'
import {
  PREVIEW_REVIEW_PHONE_BOX,
  PREVIEW_REVIEW_PHONE_GAP_CLASS,
  PREVIEW_REVIEW_PHONE_GAP_PX,
} from '@/constants/visualPreviewLayout'
import { fitPhoneBoxRem } from '@/constants/wizardResponsive'
import { WIZARD_PANE_GEOMETRY_KEY } from '@/composables/wizardPaneGeometryContext'
import PhonePreviewCanvas from '@/components/constructor/preview/PhonePreviewCanvas.vue'
import PhonePreviewSidebar from '@/components/constructor/preview/PhonePreviewSidebar.vue'
import PhonePreviewSlice from '@/components/constructor/preview/PhonePreviewSlice.vue'
import VisualComponentsPhoneEmptyState from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'

const store = useConstructorStore()
const { loadVariants, buildComposition, getOverlaySlice } = useBrandPreviewLayers()

/**
 * Two phones, 32 apart, inside the measured square — and shrinking together
 * when the square is smaller than the pair, proportions kept (bullet five of
 * the sticker `5395:118367`). Never larger than the size the kit draws them.
 */
const paneGeometry = inject(WIZARD_PANE_GEOMETRY_KEY, undefined)

const phoneBox = computed(() =>
  fitPhoneBoxRem(paneGeometry?.value.previewSide ?? 0, {
    designWidthPx: PREVIEW_REVIEW_PHONE_BOX.widthRem * 16,
    designHeightPx: PREVIEW_REVIEW_PHONE_BOX.heightRem * 16,
    count: 2,
    gapPx: PREVIEW_REVIEW_PHONE_GAP_PX,
  })
)

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
         Kit `5387:91764`: the two phones are 239.18×520, 32 apart, inside the
         575 preview square — 510.36 of it. They are the step-7 phone at four
         fifths, and the size has to be stated now that the root no longer
         shrinks with the panel. `overflow-x-auto` is the fallback for a panel
         shorter than any the designer drew, so the pair is never clipped. -->
    <div
      v-else
      :class="[
        'brand-preview-panel__dual-phones wizard-scrollbar flex flex-1 min-h-0 items-start justify-center overflow-x-auto',
        PREVIEW_REVIEW_PHONE_GAP_CLASS,
      ]"
    >
      <PhonePreviewCanvas
        v-for="phone in phones"
        :key="phone.key"
        :box-width-rem="phoneBox.widthRem"
        :box-height-rem="phoneBox.heightRem"
      >
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
