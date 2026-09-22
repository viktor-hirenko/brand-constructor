<script setup lang="ts">
import UiNameCard from '@/components/ui/UiNameCard.vue'
import { UI_NAME_CARD_GRID_CLASS } from '@/components/ui/uiNameCard'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'

/**
 * «Вибір замовника» above the internal naming list in the alternative flow.
 *
 * The designer draws it as the same kit Name card the list below now uses —
 * `5387:105118`, 259.5×64, i.e. half of the 527 container, State = Default
 * with the circle empty (`get_variable_defs` returns `checkbox/border`, not
 * `checkbox/bg/default`). It is a display of a pick already made, so the card
 * is `readonly`: no click, no hover, no tab stop.
 *
 * It used to be a hand-drawn grey tile 128 tall in a three-column grid, with
 * two colours the kit does not contain — phase 15 left it behind when it
 * redrew the list, and on screen the two sat side by side and did not match.
 * The guard test forbids those literals here, comments included.
 */
interface AuthorInternalNamingPreviewProps {
  name: string | null
}

defineProps<AuthorInternalNamingPreviewProps>()
</script>

<template>
  <div class="author-internal-naming-preview flex flex-col gap-3">
    <EditFlowSectionLabel class="author-internal-naming-preview__label">
      Вибір замовника
    </EditFlowSectionLabel>
    <div
      v-if="name"
      :class="['author-internal-naming-preview__grid', UI_NAME_CARD_GRID_CLASS]"
    >
      <UiNameCard :name="name" readonly />
    </div>
    <p
      v-else
      class="author-internal-naming-preview__empty text-[1rem] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Назву не обрано
    </p>
  </div>
</template>
