<script setup lang="ts">
import SparklesFilledIcon from '@/components/icons/SparklesFilledIcon.vue'
import UiProperty from '@/components/ui/UiProperty.vue'

interface ReviewVisualComponentsBlockProps {
  /** Comma-separated list e.g. "Header, Banners, …" */
  summary: string
}

defineProps<ReviewVisualComponentsBlockProps>()
</script>

<template>
  <UiProperty
    class="review-visual-components-block"
    type="icon-label-value"
    label="Components"
    :value="summary"
  >
    <template #icon="{ iconClass }">
      <SparklesFilledIcon :class="iconClass" />
    </template>
  </UiProperty>
</template>
