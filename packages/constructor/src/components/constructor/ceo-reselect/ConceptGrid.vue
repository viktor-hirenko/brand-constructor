<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'

interface ConceptGridProps {
  concepts: Concept[]
  /** Currently previewed concept (drives border + removes dimming). */
  previewId?: string | null
  /** Confirmed CEO concept (in addition to border, shows checkmark). */
  selectedId: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<ConceptGridProps>(), {
  disabled: false,
  previewId: null,
})

const emit = defineEmits<{
  select: [conceptId: string]
}>()

function handleClick(concept: Concept) {
  if (props.disabled) return
  emit('select', concept.id)
}

function isActive(id: string): boolean {
  return props.previewId === id || props.selectedId === id
}

function isSelected(id: string): boolean {
  return props.selectedId === id
}
</script>

<template>
  <div class="concept-grid grid grid-cols-3 gap-2 max-w-[506px]">
    <div
      v-for="concept in concepts"
      :key="concept.id"
      class="concept-grid__card relative group rounded-[16px] overflow-hidden transition-[border-color,opacity] duration-200 w-full aspect-square border-2"
      :class="[
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        isActive(concept.id) ? 'border-[#030213]' : 'border-[rgba(3,2,19,0.1)]',
        isSelected(concept.id) ? 'concept-grid__card--selected' : '',
      ]"
      @click="handleClick(concept)"
    >
      <div class="concept-grid__card-media w-full h-full absolute inset-0 bg-muted">
        <img
          v-if="concept.visual_url"
          :src="getAssetUrl(concept.visual_url)"
          :alt="concept.name"
          class="concept-grid__card-image w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div
          v-else
          class="concept-grid__card-placeholder w-full h-full flex items-center justify-center text-muted-foreground"
        >
          <svg
            class="size-12 opacity-30"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>

        <div
          class="concept-grid__card-overlay absolute inset-0 bg-black/45 transition-opacity z-[1] pointer-events-none"
          :class="
            isActive(concept.id)
              ? 'opacity-0'
              : disabled
                ? 'opacity-100'
                : 'opacity-100 group-hover:opacity-0'
          "
        />

        <div
          class="concept-grid__card-gradient absolute inset-0 bg-gradient-to-t from-black/[0.75] via-transparent to-transparent z-[2] pointer-events-none"
        />

        <div class="concept-grid__card-footer absolute bottom-0 left-0 right-0 p-4 z-[3]">
          <h3
            class="concept-grid__card-title text-white font-medium text-[18px] leading-6 tracking-[-0.4492px] line-clamp-2"
          >
            {{ concept.name }}
          </h3>
        </div>

        <div
          v-if="isSelected(concept.id)"
          class="concept-grid__card-check absolute top-[6px] left-[6px] size-8 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-[0px_8px_10px_0px_rgba(0,0,0,0.2)] z-[4]"
        >
          <svg
            class="size-4 text-[#030213]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
