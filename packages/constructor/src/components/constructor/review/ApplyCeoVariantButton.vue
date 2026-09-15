<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'

/**
 * «Застосувати варіант CEO» — kit Button, Secondary, L-48, full width.
 *
 * Measured on the drawn returned-from-CEO screen (`5387:105224`): the action
 * sits inside the section card's Property list as an instance named `Button`,
 * 495×48 — the same L-48 the navigation bar uses, not a link and not the S-32
 * chip the Comment carries. Its old class strings lived in
 * `constants/ceoCommentCardVisual.ts`; DP-15258 phase 10 removed them.
 */
interface Props {
  loading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <UiButton
    variant="secondary"
    size="L"
    :class="[
      'review-apply-ceo-button w-full whitespace-nowrap',
      loading ? 'review-apply-ceo-button--loading' : '',
    ]"
    :loading="loading"
    loading-label="Застосовується…"
    @click="emit('click')"
  >
    Застосувати варіант CEO
  </UiButton>
</template>
