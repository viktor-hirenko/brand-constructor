<script setup lang="ts">
import {
  CEO_COMMENT_RESOLVE_BUTTON_LABEL_CLASS,
  REVIEW_SECONDARY_ACTION_BUTTON_CLASS,
} from '@/constants/ceoCommentCardVisual'

interface Props {
  loading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :class="[
      'review-apply-ceo-button',
      REVIEW_SECONDARY_ACTION_BUTTON_CLASS,
      loading ? 'review-apply-ceo-button--loading' : '',
    ]"
    :disabled="loading"
    @click="emit('click')"
  >
    <span :class="CEO_COMMENT_RESOLVE_BUTTON_LABEL_CLASS">
      {{ loading ? 'Застосовується…' : 'Застосувати варіант CEO' }}
    </span>
  </button>
</template>
