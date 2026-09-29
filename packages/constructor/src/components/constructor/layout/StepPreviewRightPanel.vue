<script setup lang="ts">
/**
 * Right-column preview panel for wizard steps 1, 2, 3/4 and 7.
 *
 * Owns the per-step visual previews so `ConstructorLayout` can focus on
 * mode-routing (CEO finalize / PO returned / approved / draft / etc.).
 * Shell/right-pane padding lives in `ConstructorDualPaneShell` via
 * `dualPaneLayoutClasses.ts`; this component renders preview content only.
 *
 * NOTE: Step 8 preview is NOT handled here — it lives in `ConstructorLayout`
 * via `BrandPreviewPanel` + `ReviewSubmitView` (review shell).
 * Do not re-add a step-8 branch to this component.
 */

import { computed, inject } from 'vue'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptPreviewSliderSkeleton from '@/components/constructor/skeletons/ConceptPreviewSliderSkeleton.vue'
import ConceptPreviewEmptySkeleton from '@/components/constructor/skeletons/ConceptPreviewEmptySkeleton.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import GlobeIcon from '@/components/icons/GlobeIcon.vue'
import LinkIcon from '@/components/icons/LinkIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import type { Concept } from '@brand-constructor/shared/types'
import type { PreviewComposition, PreviewSlice } from '@/composables/useBrandPreviewLayers'
import {
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_HEADER_GAP_CLASS,
  PREVIEW_PANEL_ICON_CLASS,
  PREVIEW_PANEL_PHONE_ROW_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  PREVIEW_PANEL_TITLE_CLASS,
} from '@/constants/previewLayout'
import { PREVIEW_PHONE_BOX } from '@/constants/visualPreviewLayout'
import { fitPhoneBoxRem } from '@/constants/wizardResponsive'
import { WIZARD_PANE_GEOMETRY_KEY } from '@/composables/wizardPaneGeometryContext'
import PhonePreviewCanvas from '@/components/constructor/preview/PhonePreviewCanvas.vue'
import PhonePreviewSidebar from '@/components/constructor/preview/PhonePreviewSidebar.vue'
import PhonePreviewSlice from '@/components/constructor/preview/PhonePreviewSlice.vue'
import PreviewPanelToast from '@/components/ui/PreviewPanelToast.vue'
import SidebarScrollHint from '@/components/constructor/preview/SidebarScrollHint.vue'
import { useSidebarScrollHint } from '@/composables/useSidebarScrollHint'
import {
  STEP_ONE_CARD_CLASS,
  STEP_ONE_CARD_ICON_CLASS,
  STEP_ONE_CARD_LABEL_CLASS,
  STEP_ONE_CARD_LIST_CLASS,
  STEP_ONE_CARD_ROW_CLASS,
  STEP_ONE_CARD_TILE_CLASS,
  STEP_ONE_CARD_VALUE_CLASS,
} from '@/constants/stepOnePreviewCard'
import VisualComponentsPhoneEmptyState from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import type { VisualComponentsPhoneEmptyVariant } from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import {
  SIDEBAR_HIDDEN_CALLOUT_DURATION_MS,
  SIDEBAR_TEMPORARILY_HIDDEN_MESSAGE,
} from '@/constants/visualComponentPreviewMessages'

interface BrandBasics {
  geo: string[]
  launchDate: string
  linkedProduct: string
}

interface Props {
  currentStep: number
  brandBasics?: BrandBasics | null
  conceptPreviewForSlider: Concept | null
  isConceptSliderFinalSelected: boolean
  selectedConcept: Concept | null
  step7Composition: PreviewComposition
  step7OverlaySlice: PreviewSlice | null
  hasStep9Selections: boolean
  /**
   * Whether the Sidebar layer is drawn over the phone. The control that flips
   * it is NOT here any more — the designer's `5382:33712` puts the eye inside
   * the «Sidebar» accordion row in the left column, so this panel only obeys.
   */
  step9SidebarVisible: boolean
  sidebarHiddenCalloutVisible: boolean
  delegateToDesigners: boolean
  /** True while concept library is loading — prevents empty-state flash on step 2. */
  librariesLoading?: boolean
  /** Step 2: preview/selected id in store while libraries still loading. */
  hasStoredConceptSelection?: boolean
  /** Steps 3/4: PO ordered a new concept brief — no grid concept to preview. */
  hasOrderedNewConcept?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  'confirm-concept': []
}>()

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  return formatted.replace(/\s*р\.$/, '')
}

const hasGeo = (): boolean => (props.brandBasics?.geo?.length ?? 0) > 0
const hasDate = (): boolean => (props.brandBasics?.launchDate ?? '') !== ''
const hasLinkedProduct = (): boolean => (props.brandBasics?.linkedProduct ?? '').trim() !== ''
const hasAnyBasics = (): boolean => hasGeo() || hasDate() || hasLinkedProduct()

const step7EmptyVariant = computed((): VisualComponentsPhoneEmptyVariant =>
  props.delegateToDesigners ? 'delegated' : 'pick-components',
)

/**
 * The phone shrinks to fit the measured square, keeping its proportions —
 * bullet five of the designer's sticker `5395:118367`. At 1440 the square is
 * 575 and the drawn phone is 650, so without this the right column scrolls
 * where the mockup shows the phone whole. It never grows past its design size.
 */
const paneGeometry = inject(WIZARD_PANE_GEOMETRY_KEY, undefined)

/**
 * «Прокрутіть, щоб переглянути весь Sidebar» — DP-15450, Interface Components 3.
 * Up while the Sidebar layer is on the phone, gone after its list is first
 * scrolled; the rule is `composables/useSidebarScrollHint.ts`.
 */
const sidebarLayerShown = computed(
  () => props.currentStep === 7 && !!props.step7OverlaySlice && props.step9SidebarVisible,
)
const sidebarScrollHint = useSidebarScrollHint(sidebarLayerShown)

const phoneBox = computed(() =>
  fitPhoneBoxRem(paneGeometry?.value.previewSide ?? 0, {
    designWidthPx: PREVIEW_PHONE_BOX.widthRem * 16,
    designHeightPx: PREVIEW_PHONE_BOX.heightRem * 16,
  })
)
</script>

<template>
  <div class="relative flex flex-col flex-1 min-h-0 w-full h-full">
    <!-- Step 1 Preview.
         **This screen IS drawn, and the drawing was found after the panel was
         rebuilt.** `Brand Basics (step 1)` `5409:35822` lives on the canvas
         `UXUI-2651` — a task nobody had linked to DP-15258 — so for the whole
         project step 1 counted as "the designer drew nothing" (open question 5,
         divergences row 29). That reading is now false for the fourth time.

         What the drawn screen settles, measured off its `Right panel`:

           no header at all   the first card opens at y=32; there is no
                              «Превʼю» row. The one added here on the strength
                              of "the panel type always carries it" is removed
                              again — a drawn screen beats an inference from a
                              component (divergences row 95).
           card 543 x 124     inset 26 = padding 24 + a 2px border,
                              gap 24 between cards
           icon tile 36       a 20 glyph inside it, label 8 to its right
           value              on its own line, 18/24, at the CARD's left edge

         The cards below are those numbers now. Their recipe is
         `constants/stepOnePreviewCard.ts`, which also names the two places
         where this screen is deliberately not followed — its fixed 543 width
         and the untokened black of its value.

         They used to be the kit `UiSectionCard` + `UiProperty`: right about the
         surface (no shadow, kit radius, kit border — which is what closed the
         bug board's "прибрати тіні з карток") and wrong about everything
         inside, because the designer did not build these two cards out of those
         components at all. Hers are plain frames, and the shape differs where
         it counts: Property hangs label and value in one column beside the
         glyph, while she puts the glyph row in one band and the value in a
         second one, full width. Step 8's review IS drawn with those components,
         so they stay as they are.

         The scroll area is here for the padding as much as the scrolling: the
         pane gave up its horizontal 32 so the drawn scrollbar could float in
         it, so every branch carries its own. -->
    <template v-if="currentStep === 1">
      <div :class="PREVIEW_PANEL_ROOT_CLASS">

      <div :class="PREVIEW_PANEL_SCROLL_CLASS">
      <div v-if="brandBasics && hasAnyBasics()" :class="STEP_ONE_CARD_LIST_CLASS">
        <div v-if="hasGeo()" :class="STEP_ONE_CARD_CLASS">
          <div :class="STEP_ONE_CARD_ROW_CLASS">
            <span :class="STEP_ONE_CARD_TILE_CLASS">
              <GlobeIcon :class="STEP_ONE_CARD_ICON_CLASS" />
            </span>
            <p :class="STEP_ONE_CARD_LABEL_CLASS">Географія бренду</p>
          </div>
          <p :class="STEP_ONE_CARD_VALUE_CLASS">{{ brandBasics.geo.join(', ') }}</p>
        </div>

        <div v-if="hasDate()" :class="STEP_ONE_CARD_CLASS">
          <div :class="STEP_ONE_CARD_ROW_CLASS">
            <span :class="STEP_ONE_CARD_TILE_CLASS">
              <CalendarIcon :class="STEP_ONE_CARD_ICON_CLASS" />
            </span>
            <p :class="STEP_ONE_CARD_LABEL_CLASS">Плануєма дата запуску</p>
          </div>
          <p :class="STEP_ONE_CARD_VALUE_CLASS">{{ formatDate(brandBasics.launchDate) }}</p>
        </div>

        <!--
          The drawn screen has no third card: its «Звʼязок з іншим продуктом»
          field is empty, so the card for it is simply absent. This one is
          therefore ours in existence but hers in shape, and it keeps the two
          decisions already taken on it.

          The heading read "Опис бренду" while the card shows `linkedProduct`,
          i.e. the value of the step-1 field labelled "Звʼязок з іншим
          продуктом (якщо є)". Three places show this one value and two of them
          already called it by that name — the field itself and the review
          screen — so this was the odd one out rather than a naming choice.
          Owner's call. Divergences row 81.

          The glyph is the mapping table's: "Звʼязок з іншим продуктом | →
          Link, Regular".
        -->
        <div v-if="hasLinkedProduct()" :class="STEP_ONE_CARD_CLASS">
          <div :class="STEP_ONE_CARD_ROW_CLASS">
            <span :class="STEP_ONE_CARD_TILE_CLASS">
              <LinkIcon :class="STEP_ONE_CARD_ICON_CLASS" />
            </span>
            <p :class="STEP_ONE_CARD_LABEL_CLASS">Звʼязок з іншим продуктом</p>
          </div>
          <p :class="STEP_ONE_CARD_VALUE_CLASS">{{ brandBasics.linkedProduct }}</p>
        </div>
      </div>

      <!-- Still ours and still pre-kit — a 64 glyph at 30% over
           `text-muted-foreground`. The kit's Placeholder type writes about
           concepts, which is not what step 1 is waiting for, so its copy does
           not transfer. Recorded rather than invented away. -->
      <div v-else class="flex h-full w-full items-center justify-center">
        <div class="flex flex-col items-center text-center text-muted-foreground">
          <GlobeIcon class="size-16 mb-4 opacity-30" />
          <p>Почніть заповнювати інформацію про бренд</p>
        </div>
      </div>
      </div>
      </div>
    </template>

    <!-- Step 2: slider skeleton only when a concept is already stored (reload).
         Empty skeleton = reserved header gap + preview box, no fake title bars. -->
    <template v-else-if="currentStep === 2">
      <ConceptPreviewSliderSkeleton
        v-if="librariesLoading && hasStoredConceptSelection"
      />
      <ConceptPreviewEmptySkeleton v-else-if="librariesLoading" />
      <ConceptPreviewSlider
        v-else
        :concept="conceptPreviewForSlider"
        :top-label="isConceptSliderFinalSelected ? 'Обраний концепт' : null"
      />
    </template>

    <!-- Step 3 / 4: same canvas skeleton as step 2 slider, single header line (no pill). -->
    <template v-else-if="currentStep === 3 || currentStep === 4">
      <ConceptPreviewSliderSkeleton
        v-if="librariesLoading && hasStoredConceptSelection"
        single-header-line
      />
      <ConceptMobilePreview
        v-else
        :concept="selectedConcept"
        :empty-mode="hasOrderedNewConcept && !selectedConcept ? 'ordered-concept' : 'select-first'"
      />
    </template>

    <!-- Step 7 Preview: iPhone screen assembled from Visual Components slices -->
    <template v-else-if="currentStep === 7">
      <div :class="['relative', PREVIEW_PANEL_ROOT_CLASS]">
        <!-- The toast is absolute; the wrapper gives it back the pane's 32,
             which used to come from the pane's own padding. -->
        <div class="pointer-events-none absolute inset-x-8 top-0 z-50">
          <PreviewPanelToast
            :visible="sidebarHiddenCalloutVisible"
            :message="SIDEBAR_TEMPORARILY_HIDDEN_MESSAGE"
            :duration-ms="SIDEBAR_HIDDEN_CALLOUT_DURATION_MS"
          />
        </div>
        <!-- Her tooltip sits over the header band, above the phone — outside
             the scroll area, which would clip it. -->
        <SidebarScrollHint v-if="sidebarScrollHint.visible.value" />
        <!-- Kit `Type=UI preview` `3839:9514`, measured on the drawn step 7
             `5382:64270`: a 24 `Sparkle` in #6f6f7d, `spacing/8`, «Превʼю» in
             `header/l` 24/32 weight 500 #1f1f2e, letter-spacing 0. It was 20/32
             at −0.44 with the glyph in whatever colour it inherited. -->
        <header :class="[PREVIEW_PANEL_HEADER_CLASS, PREVIEW_PANEL_HEADER_GAP_CLASS]">
          <SparklesIcon :class="PREVIEW_PANEL_ICON_CLASS" />
          <h2 :class="PREVIEW_PANEL_TITLE_CLASS">Превʼю</h2>
        </header>
        <div :class="PREVIEW_PANEL_SCROLL_CLASS">
        <div :class="PREVIEW_PANEL_SQUARE_CLASS">
        <!-- The phone opens 24 below the top of the square and is centred
             across it — `5382:64270` puts its 239.18×520 at y=24, and the
             review does the same with its pair. This used to centre it
             vertically, which was nobody's number. -->
        <div :class="PREVIEW_PANEL_PHONE_ROW_CLASS">
          <div class="relative">
            <PhonePreviewCanvas
              :box-width-rem="phoneBox.widthRem"
              :box-height-rem="phoneBox.heightRem"
            >
              <template v-if="step7Composition.top" #top>
                <PhonePreviewSlice :slice="step7Composition.top" />
              </template>

              <template #body>
                <VisualComponentsPhoneEmptyState
                  v-if="!hasStep9Selections"
                  :variant="step7EmptyVariant"
                />
                <template v-else>
                  <PhonePreviewSlice
                    v-for="slice in step7Composition.body"
                    :key="slice.typeId"
                    :slice="slice"
                  />
                </template>
              </template>

              <template v-if="step7Composition.bottom" #bottom>
                <PhonePreviewSlice :slice="step7Composition.bottom" />
              </template>

              <!-- **No `<Transition>` — DP-15450 `visual components 2`.**
                   The layer used to slide up from the bottom edge of the phone
                   over 0.3s; her note is «Поточна анімація появи Sidebar
                   (знизу вгору) може плутати. → Прибрати анімацію появи
                   Sidebar». It is now simply drawn or not drawn. -->
              <template #overlay="{ unitRem }">
                <div
                  v-if="step7OverlaySlice && step9SidebarVisible"
                  :key="step7OverlaySlice.url"
                  class="absolute inset-0 overflow-hidden"
                >
                  <PhonePreviewSidebar
                    :slice="step7OverlaySlice"
                    :unit-rem="unitRem"
                    @scrolled="sidebarScrollHint.markScrolled"
                  />
                </div>
              </template>
            </PhonePreviewCanvas>

            <!-- **Nothing floats over the phone any more — DP-15450 `visual
                 components 4`.** A glass icon button used to sit 8 from the
                 right of the render and 42 down, and her note is «Прибрати
                 інтерактивний хрестик і окрему кнопку в preview. Додати eye /
                 eye-off біля рядка Sidebar». The eye now lives in the «Sidebar»
                 accordion row — `views/wizard/VisualComponentsView.vue` — and
                 the × in the PNG stays what it always was here: part of the
                 image, with nothing listening to it. -->
          </div>
        </div>
        </div>
        </div>
      </div>
    </template>

    <!-- Other steps: generic placeholder -->
    <template v-else>
      <div :class="[PREVIEW_PANEL_SCROLL_CLASS, 'flex items-center justify-center']">
        <div class="text-center text-muted-foreground">
          <SparklesIcon class="size-16 mx-auto mb-4 opacity-30" />
          <p>Превʼю буде доступне після реалізації цього кроку</p>
        </div>
      </div>
    </template>
  </div>
</template>
