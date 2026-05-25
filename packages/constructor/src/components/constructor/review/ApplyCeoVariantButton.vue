<script setup lang="ts">
import {
  REVIEW_APPLY_VARIANT_BUTTON_CLASS,
  REVIEW_APPLY_VARIANT_LABEL_CLASS,
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
      REVIEW_APPLY_VARIANT_BUTTON_CLASS,
      loading ? 'review-apply-ceo-button--loading' : '',
    ]"
    :disabled="loading"
    @click="emit('click')"
  >
    <span :class="REVIEW_APPLY_VARIANT_LABEL_CLASS">
      {{ loading ? 'Застосовується…' : 'Застосувати варіант CEO' }}
    </span>
  </button>
</template>
