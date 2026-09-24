<script setup lang="ts">
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
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
    <!--
      Regular weight, not Fill: all three drawn review screens — author
      `5387:91764`, CEO `5387:78989` and Brief Revision `5387:105225` — put the
      hollow `Sparkle` in this slot. The kit has no filled weight for Sparkle at
      all (divergence row 40), so the filled star we drew was ours alone.
    -->
    <template #icon="{ iconClass }">
      <SparklesIcon :class="iconClass" />
    </template>
  </UiProperty>
</template>
