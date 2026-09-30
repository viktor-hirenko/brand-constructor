<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types'
import { computed } from 'vue'
import ConceptCard from '@/components/constructor/alternative-selection/ConceptCard.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import {
  EDIT_FLOW_AUTHOR_PICK_CARD_CLASS,
  EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS,
} from '@/constants/editFlowLayout'

interface AuthorPickPreviewProps {
  concept: Concept | null
  /** When true, the PO card can be selected as the CEO's confirmed pick. */
  selectable?: boolean
  /** Highlights the PO card when it matches the staged CEO selection. */
  selected?: boolean
  /** Highlights the PO card when it drives the right-panel preview. */
  previewed?: boolean
}

const props = withDefaults(defineProps<AuthorPickPreviewProps>(), {
  selectable: false,
  selected: false,
  previewed: false,
})

const emit = defineEmits<{
  preview: []
  select: []
}>()

const previewUrl = computed(() => {
  const url = props.concept?.visual_url || props.concept?.gallery_url_1
  return url && url.trim() !== '' ? url : null
})

function handleClick() {
  if (!props.selectable || !props.concept) return
  emit('preview')
  emit('select')
}
</script>

<template>
  <!--
    The caption is the flow's own section label, not the kit component's: on
    the screens themselves (`4492:11561`, `4492:12420`) it is a 24-tall line of
    `body/medium` 16/24 with the card opening 12 below it, and every other
    label on these screens is that same line. It used to be its own `caption/l`
    14/16 at 8 — which also disagreed with its own skeleton's 12 and shifted the
    block when the data arrived (DP-15258 phase 18).
  -->
  <div :class="['author-pick-preview flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
    <EditFlowSectionLabel class="author-pick-preview__label">
      Вибір замовника
    </EditFlowSectionLabel>
    <div v-if="concept && previewUrl" :class="['author-pick-preview__card shrink-0', EDIT_FLOW_AUTHOR_PICK_CARD_CLASS]">
      <ConceptCard
        :concept="concept"
        :show-overlay="true"
        :clickable="selectable"
        :is-selected="selected"
        :is-active="selected || previewed"
        :show-selection-ring="selectable && selected"
        :show-checkmark="selectable && selected"
        :show-preview-mark="previewed && !selected"
        @click="handleClick"
      />
    </div>
    <p
      v-else
      class="author-pick-preview__empty text-[1rem] leading-6 text-ink-700 italic"
    >
      Концепт не обрано
    </p>
  </div>
</template>
