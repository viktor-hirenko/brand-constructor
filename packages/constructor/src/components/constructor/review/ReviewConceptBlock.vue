<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'

interface ReviewConceptBlockProps {
  concept: Concept | null
  /** When set, shows side-by-side PO vs CEO picks (CEO finalize review). */
  ceoConcept?: Concept | null
  /** "light" | "dark" — drives the Mode row label/icon. */
  mode: 'light' | 'dark' | null
  /** When true and `concept` is null, show "Новий концепт (бриф)" placeholder. */
  isNewConcept?: boolean
}

const props = withDefaults(defineProps<ReviewConceptBlockProps>(), {
  ceoConcept: null,
  isNewConcept: false,
})

const emit = defineEmits<{
  preview: [concept: Concept]
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

const showDual = computed(() => props.ceoConcept != null)
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
            class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors"
            aria-label="Переглянути концепт"
            @click="concept && emit('preview', concept)"
          >
            <svg
              class="size-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.99985 2.5C11.3127 2.5 14.1224 4.64745 15.1157 7.625L15.1424 7.7168C15.196 7.9317 15.1863 8.15743 15.1157 8.36849L15.1164 8.36914C14.1264 11.3495 11.3148 13.5 7.99985 13.5C4.68636 13.5 1.87539 11.3517 0.882665 8.37305V8.3724C0.802628 8.13173 0.802613 7.87152 0.882665 7.63086L0.980973 7.35417C2.04956 4.51844 4.7884 2.50004 7.99985 2.5ZM7.99985 3.5C5.12826 3.50004 2.69063 5.36295 1.83188 7.94661C1.81999 7.98237 1.82001 8.02088 1.83188 8.05664L1.91717 8.29688C2.8454 10.7538 5.21933 12.5 7.99985 12.5C10.8714 12.5 13.309 10.6374 14.1672 8.05404L14.1678 8.05208C14.1798 8.01664 14.1799 7.97917 14.1685 7.94531L14.1678 7.94336C13.3071 5.36071 10.8702 3.5 7.99985 3.5Z"
                fill="#030213"
              />
              <path
                d="M9.5 8C9.5 7.60218 9.34185 7.22076 9.06055 6.93945C8.77924 6.65815 8.39783 6.5 8 6.5C7.60218 6.5 7.22076 6.65815 6.93945 6.93945C6.65815 7.22076 6.5 7.60218 6.5 8C6.5 8.39783 6.65815 8.77924 6.93945 9.06055C7.22076 9.34185 7.60218 9.5 8 9.5C8.39783 9.5 8.77924 9.34185 9.06055 9.06055C9.34185 8.77924 9.5 8.39783 9.5 8ZM10.5 8C10.5 8.66304 10.2364 9.29874 9.76758 9.76758C9.29874 10.2364 8.66304 10.5 8 10.5C7.33696 10.5 6.70126 10.2364 6.23242 9.76758C5.76358 9.29874 5.5 8.66304 5.5 8C5.5 7.33696 5.76358 6.70126 6.23242 6.23242C6.70126 5.76358 7.33696 5.5 8 5.5C8.66304 5.5 9.29874 5.76358 9.76758 6.23242C10.2364 6.70126 10.5 7.33696 10.5 8Z"
                fill="#030213"
              />
            </svg>
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
            class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors z-[2]"
            aria-label="Переглянути концепт CEO"
            @click="ceoConcept && emit('preview', ceoConcept)"
          >
            <svg
              class="size-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.99985 2.5C11.3127 2.5 14.1224 4.64745 15.1157 7.625L15.1424 7.7168C15.196 7.9317 15.1863 8.15743 15.1157 8.36849L15.1164 8.36914C14.1264 11.3495 11.3148 13.5 7.99985 13.5C4.68636 13.5 1.87539 11.3517 0.882665 8.37305V8.3724C0.802628 8.13173 0.802613 7.87152 0.882665 7.63086L0.980973 7.35417C2.04956 4.51844 4.7884 2.50004 7.99985 2.5ZM7.99985 3.5C5.12826 3.50004 2.69063 5.36295 1.83188 7.94661C1.81999 7.98237 1.82001 8.02088 1.83188 8.05664L1.91717 8.29688C2.8454 10.7538 5.21933 12.5 7.99985 12.5C10.8714 12.5 13.309 10.6374 14.1672 8.05404L14.1678 8.05208C14.1798 8.01664 14.1799 7.97917 14.1685 7.94531L14.1678 7.94336C13.3071 5.36071 10.8702 3.5 7.99985 3.5Z"
                fill="#030213"
              />
              <path
                d="M9.5 8C9.5 7.60218 9.34185 7.22076 9.06055 6.93945C8.77924 6.65815 8.39783 6.5 8 6.5C7.60218 6.5 7.22076 6.65815 6.93945 6.93945C6.65815 7.22076 6.5 7.60218 6.5 8C6.5 8.39783 6.65815 8.77924 6.93945 9.06055C7.22076 9.34185 7.60218 9.5 8 9.5C8.39783 9.5 8.77924 9.34185 9.06055 9.06055C9.34185 8.77924 9.5 8.39783 9.5 8ZM10.5 8C10.5 8.66304 10.2364 9.29874 9.76758 9.76758C9.29874 10.2364 8.66304 10.5 8 10.5C7.33696 10.5 6.70126 10.2364 6.23242 9.76758C5.76358 9.29874 5.5 8.66304 5.5 8C5.5 7.33696 5.76358 6.70126 6.23242 6.23242C6.70126 5.76358 7.33696 5.5 8 5.5C8.66304 5.5 9.29874 5.76358 9.76758 6.23242C10.2364 6.70126 10.5 7.33696 10.5 8Z"
                fill="#030213"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Single-card legacy layout -->
    <div v-else class="flex flex-col gap-2">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір Замовника</p>
      <div
        v-if="concept && previewUrl"
        class="relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-muted"
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
          v-if="concept"
          type="button"
          class="absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors"
          aria-label="Переглянути концепт"
          @click="emit('preview', concept)"
        >
          <svg
            class="size-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.99985 2.5C11.3127 2.5 14.1224 4.64745 15.1157 7.625L15.1424 7.7168C15.196 7.9317 15.1863 8.15743 15.1157 8.36849L15.1164 8.36914C14.1264 11.3495 11.3148 13.5 7.99985 13.5C4.68636 13.5 1.87539 11.3517 0.882665 8.37305V8.3724C0.802628 8.13173 0.802613 7.87152 0.882665 7.63086L0.980973 7.35417C2.04956 4.51844 4.7884 2.50004 7.99985 2.5ZM7.99985 3.5C5.12826 3.50004 2.69063 5.36295 1.83188 7.94661C1.81999 7.98237 1.82001 8.02088 1.83188 8.05664L1.91717 8.29688C2.8454 10.7538 5.21933 12.5 7.99985 12.5C10.8714 12.5 13.309 10.6374 14.1672 8.05404L14.1678 8.05208C14.1798 8.01664 14.1799 7.97917 14.1685 7.94531L14.1678 7.94336C13.3071 5.36071 10.8702 3.5 7.99985 3.5Z"
              fill="#030213"
            />
            <path
              d="M9.5 8C9.5 7.60218 9.34185 7.22076 9.06055 6.93945C8.77924 6.65815 8.39783 6.5 8 6.5C7.60218 6.5 7.22076 6.65815 6.93945 6.93945C6.65815 7.22076 6.5 7.60218 6.5 8C6.5 8.39783 6.65815 8.77924 6.93945 9.06055C7.22076 9.34185 7.60218 9.5 8 9.5C8.39783 9.5 8.77924 9.34185 9.06055 9.06055C9.34185 8.77924 9.5 8.39783 9.5 8ZM10.5 8C10.5 8.66304 10.2364 9.29874 9.76758 9.76758C9.29874 10.2364 8.66304 10.5 8 10.5C7.33696 10.5 6.70126 10.2364 6.23242 9.76758C5.76358 9.29874 5.5 8.66304 5.5 8C5.5 7.33696 5.76358 6.70126 6.23242 6.23242C6.70126 5.76358 7.33696 5.5 8 5.5C8.66304 5.5 9.29874 5.76358 9.76758 6.23242C10.2364 6.70126 10.5 7.33696 10.5 8Z"
              fill="#030213"
            />
          </svg>
        </button>
      </div>
      <div
        v-else-if="conceptName"
        class="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62]"
      >
        {{ conceptName }}
      </div>
      <div v-else class="text-[14px] text-[#5B5B62] italic">Концепт не обрано</div>
    </div>
  </div>
</template>
