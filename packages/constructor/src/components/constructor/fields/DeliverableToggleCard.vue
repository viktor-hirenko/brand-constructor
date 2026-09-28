<script setup lang="ts">
import UiToggle from '@/components/ui/UiToggle.vue'
import {
  DELIVERABLE_CARD_CLASS,
  DELIVERABLE_CARD_DESCRIPTION_CLASS,
  DELIVERABLE_CARD_HEADER_CLASS,
  DELIVERABLE_CARD_TILE_CLASS,
  DELIVERABLE_CARD_TITLE_CLASS,
} from '@/constants/deliverableCard'

/**
 * One option card of step 6, drawn on `Deliverables (step 6)` `5411:37951`.
 * Every number lives in `constants/deliverableCard.ts`.
 *
 * The shape changed with the drawn screen: the description used to hang in a
 * text column beside the tile, and it is drawn as a second band inset under the
 * title instead — the same difference the step 1 cards turned out to have
 * against `UiProperty`.
 */
interface DeliverableToggleCardProps {
  title: string
  description: string
}

defineProps<DeliverableToggleCardProps>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <div :class="DELIVERABLE_CARD_CLASS">
    <div :class="DELIVERABLE_CARD_HEADER_CLASS">
      <div :class="DELIVERABLE_CARD_TILE_CLASS">
        <slot name="icon" />
      </div>

      <h3 :class="DELIVERABLE_CARD_TITLE_CLASS">
        {{ title }}
      </h3>

      <!--
        Kit toggle `3764:6920`. Before DP-15258 phase 14 this was a CSS peer
        recipe over a visually hidden checkbox: 56×28 with a ⌀24 thumb, inset 4,
        travel 28, and an off colour the kit does not contain. See
        `ui/uiToggle.ts` for the measured kit numbers.
      -->
      <UiToggle v-model="model" :aria-label="title" class="shrink-0 cursor-pointer" />
    </div>

    <p :class="DELIVERABLE_CARD_DESCRIPTION_CLASS">{{ description }}</p>
  </div>
</template>
