<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted, withDefaults } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'

const props = withDefaults(
  defineProps<{
    concept: Concept | null
    /** True when this concept is the final selected one */
    isFinalSelected: boolean
    /** Hide name row + "Обрати концепт" (e.g. overlay preview). */
    hideHeader?: boolean
  }>(),
  { hideHeader: false }
)

const emit = defineEmits<{
  confirmSelection: []
}>()

const store = useConstructorStore()

const showExpanded = ref(false)

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
  set: (v: number) => store.setStep3PreviewSlideIndex(v),
})

watch(
  () => [props.concept?.id, slideCount.value] as const,
  () => {
    const maxIdx = Math.max(0, slideCount.value - 1)
    if (store.step3PreviewSlideIndex > maxIdx) {
      store.setStep3PreviewSlideIndex(maxIdx)
    }
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
  if (cleanupTimer !== null) { clearTimeout(cleanupTimer); cleanupTimer = null }
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

    if (!bgUrl.value) { bgUrl.value = newUrl; return }
    if (newUrl === bgUrl.value && !fgUrl.value) return

    clearTimer()
    if (fgUrl.value) bgUrl.value = fgUrl.value
    fgUrl.value = newUrl
    fgReady.value = false
  },
)

// Preload neighbouring slides so the next/prev image is already cached
watch(activeIndex, (idx) => {
  ;[slideUrls.value[idx + 1], slideUrls.value[idx - 1]].forEach((u) => {
    if (u) { const img = new window.Image(); img.src = asset(u) }
  })
}, { immediate: true })

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
  <div class="flex flex-col gap-6 h-full min-h-[480px]">
    <!-- Empty state -->
    <div
      v-if="!concept"
      class="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground rounded-[24px] border border-dashed border-black/10 bg-muted/20"
    >
      <svg
        class="size-16 mx-auto mb-4 opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
      <p class="text-base tracking-[-0.31px] max-w-sm">
        Оберіть концепт зліва, щоб переглянути детальне превʼю тут.
      </p>
    </div>

    <template v-else>
      <!-- Header: name + select button -->
      <div
        v-if="!props.hideHeader"
        class="flex items-center justify-between gap-4 shrink-0"
      >
        <h3 class="text-2xl font-medium tracking-[-0.4492px] leading-8 truncate text-[#0a0a0a]">
          {{ concept.name }}
        </h3>
        <button
          type="button"
          :disabled="isFinalSelected"
          class="inline-flex items-center justify-center gap-2 h-12 text-base font-medium tracking-[-0.31px] transition-all shrink-0 disabled:cursor-default px-3 rounded-[8px]"
          :class="
            isFinalSelected
              ? 'bg-[#e0e0e4] text-[#030213]'
              : 'bg-[#030213] text-white hover:opacity-90 px-5'
          "
          @click="emit('confirmSelection')"
        >
          <svg
            v-if="isFinalSelected"
            class="size-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {{ isFinalSelected ? 'Обрано' : 'Обрати концепт' }}
        </button>
      </div>

      <!-- Slider canvas -->
      <div class="relative flex-1 min-h-[480px] rounded-[24px] overflow-hidden bg-muted/30">
        <!-- Crossfade: background layer — currently visible image, always fully opaque -->
        <img
          v-if="bgUrl"
          :src="asset(bgUrl)"
          :alt="concept.name"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <!-- Crossfade: foreground layer — incoming image, invisible until decoded then fades in -->
        <img
          v-if="fgUrl"
          :src="asset(fgUrl)"
          :alt="concept.name"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          :class="fgReady ? 'opacity-100' : 'opacity-0'"
          @load="onFgLoaded"
        />
        <div
          v-if="!bgUrl && !fgUrl"
          class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
        >
          Немає візуалу для цього концепту.
        </div>

        <!-- Expand (desktop preview) — only on 3rd slide (index 2) per Figma -->
        <button
          v-if="activeIndex === 2 && currentSlideUrl"
          type="button"
          class="absolute top-5 right-5 z-20 flex items-center justify-center rounded-full bg-[rgba(68,67,86,0.3)] p-3 backdrop-blur-[10px] text-white transition-colors hover:bg-[rgba(68,67,86,0.5)]"
          aria-label="Розгорнути превʼю"
          @click="showExpanded = true"
        >
          <svg
            class="size-6 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>

        <!-- Top-center dots (Figma 1450:19308 — пілюля blur + rgba фон навколо крапок) -->
        <div
          v-if="slideCount > 1"
          class="absolute top-5 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full bg-[rgba(68,67,86,0.3)] p-3 backdrop-blur-[20px]"
        >
          <div class="flex items-center gap-1.5">
            <button
              v-for="i in slideCount"
              :key="i - 1"
              type="button"
              class="rounded-full transition-all"
              :class="
                i - 1 === activeIndex ? 'size-3 bg-white' : 'size-2 bg-white/50 hover:bg-white/75'
              "
              :aria-label="`Слайд ${i}`"
              @click="activeIndex = i - 1"
            />
          </div>
        </div>

        <!-- Side arrows (Figma 1443:18972 / 1443:18975 — blur 10px, p-12, 24×24 іконка, стріла зі штуром) -->
        <button
          type="button"
          class="absolute left-5 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(68,67,86,0.3)] p-3 text-white backdrop-blur-[10px] transition-colors hover:bg-[rgba(68,67,86,0.5)] disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="activeIndex <= 0 || slideCount <= 1"
          aria-label="Попередній слайд"
          @click="goPrev"
        >
          <svg
            class="size-6 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          class="absolute right-5 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(68,67,86,0.3)] p-3 text-white backdrop-blur-[10px] transition-colors hover:bg-[rgba(68,67,86,0.5)] disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="activeIndex >= slideCount - 1 || slideCount <= 1"
          aria-label="Наступний слайд"
          @click="goNext"
        >
          <svg
            class="size-6 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 12H19M12 5l7 7-7 7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
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
          class="relative w-[1400px] max-w-[calc(100vw-40px)] h-[860px] max-h-[calc(100vh-40px)] rounded-[24px] overflow-hidden shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Розгорнуте превʼю"
          @click.stop
        >
          <button
            type="button"
            class="pointer-events-auto absolute top-6 right-6 isolate z-20 flex size-12 items-center justify-center rounded-full bg-white text-foreground shadow-lg transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
            aria-label="Закрити"
            @click="closeExpanded"
          >
            <svg
              class="size-6 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <img
            :src="asset(currentSlideUrl)"
            :alt="concept.name"
            class="relative z-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
