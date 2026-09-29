<script setup lang="ts">
/**
 * Right column of the naming steps — kit `Preview panel` `3839:9513`,
 * `Type=Concept preview` with its badge slot switched off.
 *
 * Measured on the drawn step 4 `5382:48440` (639×695 at 1440): the header is
 * the 32 name row alone, its text is literally «Обраний концепт» and the badge
 * beside it is hidden; the square under it carries neither the dots nor the
 * arrows that step 2 gets, just the picture.
 */

import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import { useAdaptiveImageFit } from '@/composables/useAdaptiveImageFit'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'
import {
  PREVIEW_IMAGE_BACKDROP_CLASS,
  PREVIEW_IMAGE_CLASS,
  previewImageFitClass,
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_PLACEHOLDER_BODY_CLASS,
  PREVIEW_PANEL_PLACEHOLDER_CLASS,
  PREVIEW_PANEL_PLACEHOLDER_ICON_CLASS,
  PREVIEW_PANEL_PLACEHOLDER_TEXT,
  PREVIEW_PANEL_PLACEHOLDER_TEXT_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
  PREVIEW_PANEL_TITLE_CLASS,
} from '@/constants/previewLayout'

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

/**
 * `select-first` is the kit's own sentence — `4492:11745`, trailing stop and
 * all, the same one step 2 already writes (divergences row 103). Ours read
 * «Спочатку оберіть концепт».
 *
 * `ordered-concept` stays ours: the kit draws no case for a concept that has
 * been ordered but not yet delivered, and inventing its copy is the same
 * forbidden move as inventing a glyph.
 */
const emptyMessage = computed(() =>
  props.emptyMode === 'ordered-concept'
    ? 'Для замовленого концепту превʼю поки недоступне.'
    : PREVIEW_PANEL_PLACEHOLDER_TEXT,
)

/** Admin: gallery_url_1 = "Gallery Image 1 (Mobile Preview)" — same as CEO reselect naming step. */
const mobileSrc = computed(() => {
  const c = props.concept
  if (!c) return null
  const url = c.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})

/**
 * DP-15450 CEO view 4, HIGH: «Preview справа некоректно масштабується:
 * порушуються пропорції, частина контенту не вміщується.» → «Зберігати фіксовані
 * пропорції preview без crop.»
 *
 * This square used to fill itself with the picture unconditionally, so a
 * concept shot that is not square lost its edges on every screen this component
 * draws — the naming steps, the final review and the CEO's own review. Step 2's
 * slider already asked `useAdaptiveImageFit` the same question; this one never
 * did. Same composable, same classes (`constants/previewLayout.ts`), so the two
 * squares cannot drift apart again.
 */
const { containerRef: squareRef, recordAspect, fitModeFor } = useAdaptiveImageFit()
const mobileFit = computed(() => fitModeFor(mobileSrc.value))
</script>

<template>
  <div :class="PREVIEW_PANEL_ROOT_CLASS">
    <!-- Kit header is 32 — the 24/32 name row and nothing else (`3839:9516`).
         The `py-2` that stood here made it 48, and the square below is sized by
         what is left, so it came out 16 short of square on steps 3 and 4.
         Divergences row 51, missed on this component the first time. -->
    <h3 :class="[PREVIEW_PANEL_HEADER_CLASS, PREVIEW_PANEL_TITLE_CLASS, 'truncate']">
      Обраний концепт
    </h3>

    <div :class="PREVIEW_PANEL_SCROLL_CLASS">
      <!-- Kit `Type=Placeholder` `4492:11680`: `#f9f9fb` inside a solid 1px
           `#eaeaeb`, a 40 `ImageSquare` in `#95959d`, `spacing/16` to the copy.
           The `min-h-[400px]` that stood here is in no kit node and fought the
           square; the box IS the square now. -->
      <div
        v-if="!concept"
        :class="[
          PREVIEW_PANEL_SQUARE_CLASS,
          PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
          PREVIEW_PANEL_PLACEHOLDER_CLASS,
        ]"
      >
        <div :class="PREVIEW_PANEL_PLACEHOLDER_BODY_CLASS">
          <ImagePlaceholderIcon :class="PREVIEW_PANEL_PLACEHOLDER_ICON_CLASS" />
          <p :class="PREVIEW_PANEL_PLACEHOLDER_TEXT_CLASS">
            {{ emptyMessage }}
          </p>
        </div>
      </div>

      <div
        v-else
        ref="squareRef"
        :class="[
          PREVIEW_PANEL_SQUARE_CLASS,
          PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
          'relative overflow-hidden bg-muted/30',
        ]"
      >
        <!-- Shown whole rather than cropped (DP-15450 CEO view 4). The blurred
             copy is what fills the space left over — see `previewLayout.ts`. -->
        <img
          v-if="mobileSrc && mobileFit === 'contain'"
          :src="mobileSrc"
          alt=""
          aria-hidden="true"
          :class="PREVIEW_IMAGE_BACKDROP_CLASS"
        />
        <img
          v-if="mobileSrc"
          :src="mobileSrc"
          :alt="concept.name || 'Mobile preview'"
          :class="[PREVIEW_IMAGE_CLASS, previewImageFitClass(mobileFit)]"
          loading="lazy"
          @load="e => recordAspect(mobileSrc, e)"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center"
        >
          Немає мобільного превʼю (gallery_url_1)
        </div>
      </div>
    </div>
  </div>
</template>
