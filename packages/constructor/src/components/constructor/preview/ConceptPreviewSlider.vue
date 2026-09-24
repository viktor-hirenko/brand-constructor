<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'
import ArrowLeftIcon from '@/components/icons/ArrowLeftIcon.vue'
import ArrowRightIcon from '@/components/icons/ArrowRightIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'
import MaximizeIcon from '@/components/icons/MaximizeIcon.vue'
import SelectionPillBadge from '@/components/ui/SelectionPillBadge.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPagination from '@/components/ui/UiPagination.vue'
import { useAdaptiveImageFit } from '@/composables/useAdaptiveImageFit'
import { PREVIEW_HEADER_RESERVE_CLASS } from '@/constants/previewLayout'

// `radius/concept-preview` 24 — the kit keeps it on every breakpoint frame
// (`I5395:118764;3717:1816` and siblings), so the radius no longer depends on
// the mode. It used to be dropped in the Admin because the preview filled an
// edge-to-edge panel and a rounded rectangle inside a square one read as a
// card-in-a-card; the responsive work gave the preview its own 32 padding and
// its square shape, which is the frame the radius belongs to. With the last
// caller gone, `isEmbedded` is no longer imported here.

const props = withDefaults(
  defineProps<{
    concept: Concept | null
    /** True when this concept is the final selected one */
    isFinalSelected: boolean
    /** Hide name row + "Обрати концепт" (e.g. overlay preview). */
    hideHeader?: boolean
    /** Small label above the concept name (e.g. "Вибір замовника" / "Вибір CEO"). */
    topLabel?: string | null
    /** Override the primary action button label (default "Обрати концепт"). */
    confirmLabel?: string
    /** Force-disable the primary action regardless of `isFinalSelected`. */
    confirmDisabled?: boolean
    /** When true, primary action emits `cancelSelection` instead of `confirmSelection`. */
    cancelMode?: boolean
    /** Hide only the action button while keeping name and topLabel visible. */
    hidePrimaryAction?: boolean
  }>(),
  {
    hideHeader: false,
    topLabel: null,
    confirmLabel: '',
    confirmDisabled: false,
    cancelMode: false,
    hidePrimaryAction: false,
  }
)

const emit = defineEmits<{
  confirmSelection: []
  cancelSelection: []
}>()

const computedConfirmLabel = computed(() => {
  if (props.confirmLabel) return props.confirmLabel
  if (props.cancelMode) return 'Скасувати вибір'
  return props.isFinalSelected ? 'Обрано' : 'Обрати концепт'
})

const computedConfirmDisabled = computed(
  () => props.confirmDisabled || (!props.cancelMode && props.isFinalSelected)
)

function handlePrimaryClick() {
  if (computedConfirmDisabled.value) return
  if (props.cancelMode) {
    emit('cancelSelection')
  } else {
    emit('confirmSelection')
  }
}

const store = useConstructorStore()

const showExpanded = ref(false)

/** 0-based: expand/modal button only on the 6th gallery slide (Figma). */
const EXPAND_MODAL_SLIDE_INDEX = 5

/** Slider uses gallery only — first DB image (`visual_url`) is thumbnail for grid, not carousel */
const slideUrls = computed<string[]>(() => {
  const c = props.concept
  if (!c) return []
  const candidates = [
    c.gallery_url_1,
    c.gallery_url_2,
    c.gallery_url_3,
    c.gallery_url_4,
    c.gallery_url_5,
    c.gallery_url_6,
    c.gallery_url_7,
    c.gallery_url_8,
    c.gallery_url_9,
    c.gallery_url_10,
  ]
  return candidates.filter((u): u is string => typeof u === 'string' && u.trim() !== '')
})

const slideCount = computed(() => slideUrls.value.length)

const activeIndex = computed({
  get: () => store.step3PreviewSlideIndex,
  set: (v: number) => store.setStep3PreviewSlideIndex(v, props.concept?.id ?? null),
})

watch(
  () => [props.concept?.id, slideCount.value] as const,
  ([conceptId, count]) => {
    const maxIdx = Math.max(0, count - 1)
    store.applyPreviewSlideIndexForConcept(conceptId, maxIdx)
  },
  { immediate: true }
)

function goPrev() {
  activeIndex.value = Math.max(0, activeIndex.value - 1)
}

function goNext() {
  activeIndex.value = Math.min(slideCount.value - 1, activeIndex.value + 1)
}

const currentSlideUrl = computed(() => slideUrls.value[activeIndex.value] ?? null)

function asset(src: string | null | undefined): string {
  if (!src) return ''
  return getAssetUrl(src)
}

// ─── Crossfade state ────────────────────────────────────────────────────────
// bgUrl  = visible image (always opaque)
// fgUrl  = incoming image; invisible until decoded, then fades in
// On concept change → snap (no fade) to avoid mixing two different concepts.
// On slide change within same concept → crossfade.
const bgUrl = ref<string | null>(currentSlideUrl.value)
const fgUrl = ref<string | null>(null)
const fgReady = ref(false)
let cleanupTimer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (cleanupTimer !== null) {
    clearTimeout(cleanupTimer)
    cleanupTimer = null
  }
}

watch(
  [() => props.concept?.id, currentSlideUrl] as const,
  ([newConceptId, newUrl], [oldConceptId]) => {
    if (newConceptId !== oldConceptId) {
      clearTimer()
      bgUrl.value = newUrl
      fgUrl.value = null
      fgReady.value = false
      showExpanded.value = false
      return
    }

    if (!newUrl) {
      clearTimer()
      bgUrl.value = null
      fgUrl.value = null
      fgReady.value = false
      return
    }

    if (!bgUrl.value) {
      bgUrl.value = newUrl
      return
    }
    if (newUrl === bgUrl.value && !fgUrl.value) return

    clearTimer()
    if (fgUrl.value) bgUrl.value = fgUrl.value
    fgUrl.value = newUrl
    fgReady.value = false
  }
)

// Preload neighbouring slides so the next/prev image is already cached
watch(
  activeIndex,
  idx => {
    ;[slideUrls.value[idx + 1], slideUrls.value[idx - 1]].forEach(u => {
      if (u) {
        const img = new window.Image()
        img.src = asset(u)
      }
    })
  },
  { immediate: true }
)

function onFgLoaded() {
  if (!fgUrl.value) return
  fgReady.value = true
  clearTimer()
  cleanupTimer = setTimeout(() => {
    if (fgUrl.value) bgUrl.value = fgUrl.value
    fgUrl.value = null
    fgReady.value = false
    cleanupTimer = null
  }, 300)
}
// ─────────────────────────────────────────────────────────────────────────────

// Adaptive cover/contain — see useAdaptiveImageFit for the rationale. Separate
// instances for the inline canvas and the expanded (Teleport) modal since they
// have independent container sizes.
const { containerRef: sliderCanvasRef, recordAspect: recordSlideAspect, fitModeFor: slideFitFor } =
  useAdaptiveImageFit()
const bgFit = computed(() => slideFitFor(bgUrl.value))
const fgFit = computed(() => slideFitFor(fgUrl.value))

const {
  containerRef: expandedCanvasRef,
  recordAspect: recordExpandedAspect,
  fitModeFor: expandedFitFor,
} = useAdaptiveImageFit()
const expandedFit = computed(() => expandedFitFor(currentSlideUrl.value))

function closeExpanded() {
  showExpanded.value = false
}

function onKeydownEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && showExpanded.value) {
    closeExpanded()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydownEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydownEscape)
  if (cleanupTimer !== null) clearTimeout(cleanupTimer)
})
</script>

<template>
  <div class="flex flex-col gap-6 h-full">
    <!-- Empty state — header area reserved (matches ConceptPreviewEmptySkeleton). -->
    <template v-if="!concept">
      <div :class="['shrink-0', PREVIEW_HEADER_RESERVE_CLASS]" aria-hidden="true" />
      <div
        class="flex-1 min-h-0 flex flex-col items-center justify-center rounded-[24px] text-center text-muted-foreground border border-dashed border-[rgba(0,0,0,0.1)] bg-[#f9f9fb]"
      >
        <ImagePlaceholderIcon class="size-10 mb-6 text-[#c8c8c8]" />
        <p class="text-base leading-6 tracking-[-0.3125px] text-ink-700 max-w-[200px]">
          Оберіть концепт зліва, щоб переглянути превʼю
        </p>
      </div>
    </template>

    <template v-else>
      <!-- Header: name + optional pill badge + select button -->
      <!-- Kit Preview panel header `3717:1810`: name + badge in one row,
           `spacing/8` between them, title `header/l` 24/32 weight 500 on
           `preview-panel/content/title` #1f1f2e (= --color-ink-900). -->
      <div v-if="!props.hideHeader" class="flex items-center justify-between gap-4 shrink-0">
        <!-- Kit header is 32 — the 24/32 name row and nothing else. The `py-2`
             that stood here made it 48, reserving room for the "Обрати
             концепт" button, which no call site renders (all four pass
             `hide-primary-action` or `hide-header`). Divergences row 51, and
             the responsive square needs the 32 to come out square. -->
        <div class="min-w-0 flex items-center gap-2">
          <h3
            class="min-w-0 flex-1 text-2xl font-medium leading-8 truncate text-ink-900"
          >
            {{ concept.name }}
          </h3>
          <SelectionPillBadge v-if="topLabel" :label="topLabel" />
        </div>
        <button
          v-if="!hidePrimaryAction"
          type="button"
          :disabled="computedConfirmDisabled"
          class="inline-flex items-center justify-center gap-2 h-12 text-base font-medium tracking-[-0.31px] transition-all shrink-0 disabled:cursor-not-allowed rounded-[8px] px-5"
          :class="
            computedConfirmDisabled
              ? 'bg-[#ececf0] text-[#030213] opacity-60'
              : cancelMode
                ? 'bg-[#ececf0] text-[#030213] hover:bg-[#dedde3]'
                : 'bg-[#030213] text-white hover:opacity-90'
          "
          @click="handlePrimaryClick"
        >
          <CheckIcon v-if="!cancelMode && isFinalSelected" class="size-5 shrink-0" />
          {{ computedConfirmLabel }}
        </button>
      </div>

      <!-- Slider canvas -->
      <div
        ref="sliderCanvasRef"
        class="relative flex-1 min-h-0 overflow-hidden rounded-[24px] bg-muted/30"
      >
        <!-- Crossfade: background layer — currently visible image, always fully opaque.
             When the canvas aspect ratio drifts too far from the slide's own (a
             wide-but-short viewport), plain `cover` would crop text off the slide.
             `bgFit`/`fgFit` detect that and switch to `contain`; the blurred
             duplicate behind it fills the letterbox instead of a flat colour. -->
        <img
          v-if="bgUrl && bgFit === 'contain'"
          :src="asset(bgUrl)"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full scale-110 object-cover blur-2xl brightness-[0.7]"
        />
        <img
          v-if="bgUrl"
          :src="asset(bgUrl)"
          :alt="concept.name"
          class="absolute inset-0 w-full h-full"
          :class="bgFit === 'contain' ? 'object-contain' : 'object-cover'"
          @load="e => recordSlideAspect(bgUrl, e)"
        />
        <!-- Crossfade: foreground layer — incoming image, invisible until decoded then fades in -->
        <img
          v-if="fgUrl && fgFit === 'contain'"
          :src="asset(fgUrl)"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full scale-110 object-cover blur-2xl brightness-[0.7] transition-opacity duration-300"
          :class="fgReady ? 'opacity-100' : 'opacity-0'"
        />
        <img
          v-if="fgUrl"
          :src="asset(fgUrl)"
          :alt="concept.name"
          class="absolute inset-0 w-full h-full transition-opacity duration-300"
          :class="[fgFit === 'contain' ? 'object-contain' : 'object-cover', fgReady ? 'opacity-100' : 'opacity-0']"
          @load="e => { recordSlideAspect(fgUrl, e); onFgLoaded() }"
        />
        <div
          v-if="!bgUrl && !fgUrl"
          class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
        >
          Немає візуалу для цього концепту.
        </div>

        <!-- Expand (desktop preview) — only on 6th slide (index 5) per Figma.
             Kit icon button `3333:5541`, Glass L-48: the glass style is exactly
             this case, a control floating over an image. -->
        <UiIconButton
          v-if="activeIndex === EXPAND_MODAL_SLIDE_INDEX && currentSlideUrl"
          variant="glass"
          class="absolute top-5 right-5 z-20"
          aria-label="Розгорнути превʼю"
          @click="showExpanded = true"
        >
          <template #default="{ iconClass }">
            <MaximizeIcon :class="iconClass" />
          </template>
        </UiIconButton>

        <!-- Top-centre dots. Kit Pagination `3715:5756`, inset 20 from the
             preview edge like the Navigation row below — that inset is the
             `spacing/20` padding the kit's Preview frame carries. Until phase
             17 this pill was the last carrier of the pre-kit glass tone; the
             fill it uses now lives in `ui/uiPagination.ts`. -->
        <UiPagination
          v-if="slideCount > 1"
          class="absolute top-5 left-1/2 z-10 -translate-x-1/2"
          :count="slideCount"
          :active-index="activeIndex"
          @select="index => (activeIndex = index)"
        />

        <!-- Side arrows. Kit Preview panel `3717:1817` builds its Navigation row
             from two Icon buttons, Glass L-48, inset 20 from the preview edges
             and vertically centred — `left-5` / `right-5` is that 20 in rem.
             Disabled is the kit's `opacity/50`, not the 30% this used to use. -->
        <UiIconButton
          variant="glass"
          class="absolute left-5 top-1/2 z-10 -translate-y-1/2"
          :disabled="activeIndex <= 0 || slideCount <= 1"
          aria-label="Попередній слайд"
          @click="goPrev"
        >
          <template #default="{ iconClass }">
            <ArrowLeftIcon :class="iconClass" />
          </template>
        </UiIconButton>

        <UiIconButton
          variant="glass"
          class="absolute right-5 top-1/2 z-10 -translate-y-1/2"
          :disabled="activeIndex >= slideCount - 1 || slideCount <= 1"
          aria-label="Наступний слайд"
          @click="goNext"
        >
          <template #default="{ iconClass }">
            <ArrowRightIcon :class="iconClass" />
          </template>
        </UiIconButton>
      </div>
    </template>

    <!-- Desktop expanded modal (Figma 1443:2888) -->
    <Teleport to="body">
      <div
        v-if="showExpanded && currentSlideUrl && concept"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/60"
        role="presentation"
        @click="closeExpanded"
      >
        <div
          ref="expandedCanvasRef"
          class="relative w-[1400px] max-w-[calc(100vw-40px)] h-[860px] max-h-[calc(100vh-40px)] rounded-[24px] overflow-hidden shadow-2xl bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Розгорнуте превʼю"
          @click.stop
        >
          <!-- Kit icon button `3333:5541`, Solid L-48. This one is not the
               modal-header cross (a bare 24 glyph, `UiModal`): it floats over
               the image inside the lightbox and needs its own chrome. -->
          <UiIconButton
            class="pointer-events-auto absolute top-6 right-6 isolate z-20"
            aria-label="Закрити"
            @click="closeExpanded"
          >
            <template #default="{ iconClass }">
              <CloseIcon :class="iconClass" />
            </template>
          </UiIconButton>
          <img
            :src="asset(currentSlideUrl)"
            :alt="concept.name"
            class="relative z-0 h-full w-full"
            :class="expandedFit === 'contain' ? 'object-contain' : 'object-cover'"
            @load="e => recordExpandedAspect(currentSlideUrl, e)"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
