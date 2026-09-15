<script setup lang="ts">
import { computed } from 'vue'
import UnresolvedDot from '@/components/ui/UnresolvedDot.vue'
import SectionStatusBadge from '@/components/ui/SectionStatusBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'
import PencilIcon from '@/components/icons/PencilIcon.vue'

/**
 * The header action is the kit's Ghost button at M-40, not a link: the drawn
 * section card carries it as instance `3760:2297` — 128×40, `radius/button` 8,
 * `button/ghost/content/default` #393947, `caption/l/medium` 14/16, 12 padding
 * with a 4 gap — which DP-15258 phase 9 measured while deciding that the five
 * «Переглянути» actions elsewhere in review ARE links. Same header, two
 * different kit parts; that is the kit's call, not ours.
 */

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

const titleTruncates = computed(() => {
  const normalized = props.title.toLowerCase()
  return (
    normalized.includes('обрати') ||
    normalized.includes('бути') ||
    normalized.includes('быть')
  )
})
</script>

<template>
  <section v-if="borderless" class="review-section review-section--borderless flex flex-col">
    <div class="review-section__content flex flex-col gap-4">
      <slot />
    </div>
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
      <div
        :class="[
          'review-section__indicators flex min-w-0 flex-1 items-center gap-2',
          needsChoice || titleTruncates ? 'flex-nowrap' : 'flex-wrap',
        ]"
      >
        <h3
          :class="[
            'review-section__title text-[1.125rem] font-medium leading-6 tracking-[-0.1504px] text-[#0a0a0a]',
            needsChoice || titleTruncates ? 'min-w-0 truncate' : '',
          ]"
        >
          {{ title }}
        </h3>
        <UnresolvedDot v-if="hasUnresolved && !needsChoice" />
        <SectionStatusBadge v-if="needsChoice" variant="attention" />
      </div>
      <UiButton
        v-if="editStep != null"
        variant="ghost"
        size="M"
        class="review-section__edit-button shrink-0"
        @click="onEditClick"
      >
        <template #icon-left="{ iconClass }">
          <PencilIcon :class="iconClass" />
        </template>
        Редагувати
      </UiButton>
      <UiButton
        v-else-if="changeChoice"
        variant="ghost"
        size="M"
        class="review-section__change-button shrink-0"
        @click="emit('change')"
      >
        <template #icon-left="{ iconClass }">
          <RefreshIcon :class="iconClass" />
        </template>
        Змінити вибір
      </UiButton>
    </header>
    <hr class="border-t border-black/10" />
    <div class="review-section__body p-4 flex flex-col">
      <div class="review-section__content flex flex-col gap-4">
        <slot />
      </div>
      <slot name="comment" />
    </div>
  </section>
</template>
