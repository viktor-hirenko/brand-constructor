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
import {
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_HEADER_GAP_CLASS,
  PREVIEW_PANEL_ICON_CLASS,
  PREVIEW_PANEL_PHONE_INSET_PX,
  PREVIEW_PANEL_PHONE_ROW_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  PREVIEW_PANEL_TITLE_CLASS,
} from '@/constants/previewLayout'
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
    insetTopPx: PREVIEW_PANEL_PHONE_INSET_PX,
    insetBottomPx: PREVIEW_PANEL_PHONE_INSET_PX,
  })
)

/** The lone phone of «Довірити вибір дизайнерам» — fitted the same way; it used to take the default box. */
const lonePhoneBox = computed(() =>
  fitPhoneBoxRem(paneGeometry?.value.previewSide ?? 0, {
    designWidthPx: PREVIEW_REVIEW_PHONE_BOX.widthRem * 16,
    designHeightPx: PREVIEW_REVIEW_PHONE_BOX.heightRem * 16,
    insetTopPx: PREVIEW_PANEL_PHONE_INSET_PX,
    insetBottomPx: PREVIEW_PANEL_PHONE_INSET_PX,
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
  <aside :class="['relative bg-white', PREVIEW_PANEL_ROOT_CLASS]">
    <!-- Kit `Type=UI preview` `3839:9514`: a 24 `Sparkle` in
         `preview panel/content/icon` #6f6f7d, `spacing/8`, and the title in
         `header/l` 24/32 weight 500 on `preview panel/content/title` #1f1f2e
         with letter-spacing 0. It was 20/32 at −0.45 next to a #5B5B62 glyph —
         a hex the kit does not carry anywhere, divergences row 26. -->
    <header :class="[PREVIEW_PANEL_HEADER_CLASS, PREVIEW_PANEL_HEADER_GAP_CLASS]">
      <SparklesIcon :class="PREVIEW_PANEL_ICON_CLASS" />
      <h2 :class="PREVIEW_PANEL_TITLE_CLASS">Превʼю</h2>
    </header>

    <div :class="PREVIEW_PANEL_SCROLL_CLASS">
      <div :class="PREVIEW_PANEL_SQUARE_CLASS">
    <!-- Delegated: single phone carrying the empty state, as on step 7. -->
    <div v-if="isDelegated" :class="PREVIEW_PANEL_PHONE_ROW_CLASS">
      <PhonePreviewCanvas
        :box-width-rem="lonePhoneBox.widthRem"
        :box-height-rem="lonePhoneBox.heightRem"
      >
        <template #body>
          <VisualComponentsPhoneEmptyState variant="delegated" />
        </template>
      </PhonePreviewCanvas>
    </div>

    <!-- Normal: the screen, and the screen with the sidebar open.
         Kit `5387:91948`: the two phones are 239.18×520, 32 apart and centred
         inside the 575 preview square — 510.36 of it — and both open at y=24
         from its top edge, which is what `PREVIEW_PANEL_PHONE_ROW_CLASS`
         carries. They are the step-7 phone at four fifths; step 7 draws the
         same 239.18×520 (`5382:64270`), so it is one size, not two.
         `overflow-x-auto` used to stand here as a fallback and is gone: the
         pair can no longer outgrow the square (`fitPhoneBoxRem` shrinks it to
         fit), and a horizontal scroll container inside the square would have
         made its block axis a scroll container too. -->
    <div
      v-else
      :class="[
        'brand-preview-panel__dual-phones',
        PREVIEW_PANEL_PHONE_ROW_CLASS,
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
      </div>
    </div>
  </aside>
</template>
