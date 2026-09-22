<script setup lang="ts">
import { computed } from 'vue'
import UnresolvedDot from '@/components/ui/UnresolvedDot.vue'
import SectionStatusBadge from '@/components/ui/SectionStatusBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSectionCard from '@/components/ui/UiSectionCard.vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'
import PencilIcon from '@/components/icons/PencilIcon.vue'

/**
 * Review's adapter over the kit Section card `3761:2273` — the card itself is
 * `ui/UiSectionCard.vue` since DP-15258 phase 13. What stays here is review's
 * own business: which action the header shows, whether the section is flagged
 * as needing a comment, and the borderless variant the kit has no symbol for.
 *
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

const cardModifierClass = computed(() => [
  'review-section',
  props.hasUnresolved && !props.needsChoice ? 'review-section--has-unresolved' : '',
  props.needsChoice ? 'review-section--needs-choice' : '',
  props.highlighted ? 'review-section--highlighted' : '',
])
</script>

<template>
  <section v-if="borderless" class="review-section review-section--borderless flex flex-col">
    <div class="review-section__content flex flex-col gap-4">
      <slot />
    </div>
    <slot name="comment" />
  </section>

  <UiSectionCard
    v-else
    :title="title"
    :highlighted="highlighted"
    :title-truncates="needsChoice || titleTruncates"
    :class="cardModifierClass"
  >
    <template #badge>
      <UnresolvedDot v-if="hasUnresolved && !needsChoice" />
      <SectionStatusBadge v-if="needsChoice" variant="attention" />
    </template>

    <template #action>
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
    </template>

    <slot />

    <template #comment>
      <slot name="comment" />
    </template>
  </UiSectionCard>
</template>
