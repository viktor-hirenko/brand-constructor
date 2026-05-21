<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'

interface ReviewConceptBlockProps {
  concept: Concept | null
  /** When set, shows side-by-side PO vs CEO picks (CEO finalize review). */
  ceoConcept?: Concept | null
  /** "light" | "dark" — drives the Mode row label/icon. */
  mode: 'light' | 'dark' | null
  /** When true and `concept` is null, show "Новий концепт (бриф)" placeholder. */
  isNewConcept?: boolean
  /**
   * PO returned-from-CEO: CEO proposed an alternative concept and PO
   * hasn't resolved it yet → show dual-view + "Застосувати варіант CEO" button.
   */
  showApplyCeo?: boolean
  /** Whether an apply operation is currently in-flight (disables button). */
  applyLoading?: boolean
  /**
   * PO applied CEO concept → show single card labeled "Обраний концепт"
   * instead of dual-view.
   */
  ceoApplied?: boolean
}

const props = withDefaults(defineProps<ReviewConceptBlockProps>(), {
  ceoConcept: null,
  isNewConcept: false,
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
})

const emit = defineEmits<{
  preview: [concept: Concept]
  applyCeo: []
}>()

const previewUrl = computed(() => {
  const url = props.concept?.visual_url || props.concept?.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})

const ceoPreviewUrl = computed(() => {
  const c = props.ceoConcept
  if (!c) return null
  const url = c.visual_url || c.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})

const conceptName = computed(() => {
  if (props.concept) return props.concept.name
  if (props.isNewConcept) return 'Новий концепт (бриф)'
  return null
})

const modeLabel = computed(() => (props.mode === 'dark' ? 'Dark' : 'Light'))

/** Show dual PO/CEO cards when CEO has an alternative and it's not yet applied. */
const showDual = computed(() => props.ceoConcept != null && !props.ceoApplied)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Mode row -->
    <div class="flex items-start gap-2">
      <div class="size-5 shrink-0 text-[#5B5B62]">
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
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Mode</p>
        <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
          {{ modeLabel }}
        </p>
      </div>
    </div>

    <!-- Dual cards: PO + CEO -->
    <div v-if="showDual" class="grid grid-cols-2 gap-3 max-w-[506px]">
      <div class="flex flex-col gap-2 min-w-0">
        <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
        <div
          v-if="concept && previewUrl"
          class="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted"
        >
          <img
            :src="previewUrl"
            :alt="concept.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div
            class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent"
          >
            <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">
              {{ concept.name }}
            </p>
          </div>
          <button
            type="button"
            class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
            aria-label="Переглянути концепт"
            @click="concept && emit('preview', concept)"
          >
            <EyeIcon />
          </button>
        </div>
        <div
          v-else-if="conceptName"
          class="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62] w-full"
        >
          {{ conceptName }}
        </div>
        <div v-else class="text-[14px] text-[#5B5B62] italic">Концепт не обрано</div>
      </div>

      <div class="flex flex-col gap-2 min-w-0">
        <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір CEO</p>
        <div
          v-if="ceoConcept && ceoPreviewUrl"
          class="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted"
        >
          <img
            :src="ceoPreviewUrl"
            :alt="ceoConcept.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div
            class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent"
          >
            <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">
              {{ ceoConcept.name }}
            </p>
          </div>
          <button
            type="button"
            class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors z-[2] text-[#030213]"
            aria-label="Переглянути концепт CEO"
            @click="ceoConcept && emit('preview', ceoConcept)"
          >
            <EyeIcon />
          </button>
        </div>
      </div>
    </div>
    <!-- Apply button inside dual block -->
    <ApplyCeoVariantButton
      v-if="showDual && showApplyCeo"
      :loading="applyLoading"
      @click="emit('applyCeo')"
    />

    <!-- Applied state: single card with "Обраний концепт" label (Figma 1981:1694) -->
    <div v-if="!showDual && ceoApplied" class="flex flex-col gap-2">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Обраний концепт</p>
      <div
        v-if="concept && previewUrl"
        class="relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-muted"
      >
        <img :src="previewUrl" :alt="concept.name" class="w-full h-full object-cover" loading="lazy" />
        <div class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent">
          <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">{{ concept.name }}</p>
        </div>
        <button
          v-if="concept"
          type="button"
          class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
          aria-label="Переглянути концепт"
          @click="emit('preview', concept)"
        >
          <EyeIcon />
        </button>
      </div>
      <div v-else-if="conceptName" class="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62]">
        {{ conceptName }}
      </div>
    </div>

    <!-- Single-card layout (PO draft / CEO with no alternative / PO returned no alt) -->
    <div v-if="!showDual && !ceoApplied" class="flex flex-col gap-2">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір Замовника</p>
      <div
        v-if="concept && previewUrl"
        class="relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-muted"
      >
        <img :src="previewUrl" :alt="concept.name" class="w-full h-full object-cover" loading="lazy" />
        <div class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent">
          <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">{{ concept.name }}</p>
        </div>
        <button
          v-if="concept"
          type="button"
          class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
          aria-label="Переглянути концепт"
          @click="emit('preview', concept)"
        >
          <EyeIcon />
        </button>
      </div>
      <div v-else-if="conceptName" class="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62]">
        {{ conceptName }}
      </div>
      <div v-else class="text-[14px] text-[#5B5B62] italic">Концепт не обрано</div>
    </div>
  </div>
</template>
