<script setup lang="ts">
import SparklesFilledIcon from '@/components/icons/SparklesFilledIcon.vue'

interface ReviewVisualComponentsBlockProps {
  /** Comma-separated list e.g. "Header, Banners, …" */
  summary: string
}

defineProps<ReviewVisualComponentsBlockProps>()
</script>

<template>
  <div class="review-visual-components-block flex items-start gap-2">
    <div class="review-visual-components-block__icon size-5 shrink-0 text-[#5B5B62]">
      <SparklesFilledIcon class="size-5 text-[#5B5B62]" />
    </div>
    <div class="review-visual-components-block__content flex-1 min-w-0 flex flex-col gap-1">
      <p class="review-visual-components-block__label text-[14px] font-medium leading-4 text-[#5B5B62]">
        Components
      </p>
      <p class="review-visual-components-block__value text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
        {{ summary }}
      </p>
    </div>
  </div>
</template>
