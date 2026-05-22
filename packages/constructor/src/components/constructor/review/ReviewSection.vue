<script setup lang="ts">
import UnresolvedDot from '@/components/ui/UnresolvedDot.vue'
import SectionStatusBadge from '@/components/ui/SectionStatusBadge.vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'
import PencilIcon from '@/components/icons/PencilIcon.vue'

interface ReviewSectionProps {
  title: string
  /** Render the "Змінити вибір" button in the header. */
  changeChoice?: boolean
  /** PO final review: step number for "Редагувати" → navigate to step. */
  editStep?: number
  /** Highlight the section (amber border) when validation requires action here. */
  highlighted?: boolean
  /** No card chrome (border/hr) — for loose blocks only if needed. */
  borderless?: boolean
  /**
   * Shows a blue 6×6 dot indicator in the section header.
   * True when the section has at least one unresolved CEO comment.
   */
  hasUnresolved?: boolean
  /**
   * When true, shows "Потрібно обрати варіант" amber badge in the header.
   * Used for Concept/External/Internal sections when CEO proposed an alternative.
   */
  needsChoice?: boolean
}

const props = withDefaults(defineProps<ReviewSectionProps>(), {
  changeChoice: false,
  editStep: undefined,
  highlighted: false,
  borderless: false,
  hasUnresolved: false,
  needsChoice: false,
})

const emit = defineEmits<{
  change: []
  edit: [step: number]
}>()

function onEditClick() {
  if (props.editStep != null) {
    emit('edit', props.editStep)
  }
}
</script>

<template>
  <section v-if="borderless" class="review-section review-section--borderless space-y-4">
    <slot />
    <slot name="comment" />
  </section>

  <section
    v-else
    :class="[
      'review-section rounded-2xl border bg-white transition-colors',
      highlighted ? 'border-amber-400 ring-2 ring-amber-200 review-section--highlighted' : 'border-[#EDEDED]',
      hasUnresolved && !needsChoice ? 'review-section--has-unresolved' : '',
      needsChoice ? 'review-section--needs-choice' : '',
    ]"
  >
    <header class="review-section__header flex items-center justify-between h-14 pl-4 pr-2">
      <div class="review-section__indicators flex items-center gap-2 flex-wrap">
        <h3
          class="review-section__title text-[18px] font-medium leading-6 tracking-[-0.1504px] text-[#0a0a0a]"
        >
          {{ title }}
        </h3>
        <UnresolvedDot v-if="hasUnresolved && !needsChoice" />
        <SectionStatusBadge v-if="needsChoice" variant="attention" />
      </div>
      <button
        v-if="editStep != null"
        type="button"
        class="review-section__edit-button inline-flex items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
        @click="onEditClick"
      >
        <PencilIcon class="size-4 shrink-0 text-[#373737]" />
        Редагувати
      </button>
      <button
        v-else-if="changeChoice"
        type="button"
        class="review-section__change-button inline-flex items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
        @click="emit('change')"
      >
        <RefreshIcon class="size-4 shrink-0 text-[#373737]" />
        Змінити вибір
      </button>
    </header>
    <hr class="border-t border-black/10" />
    <div class="review-section__body p-4 flex flex-col gap-4">
      <slot />
      <slot name="comment" />
    </div>
  </section>
</template>
