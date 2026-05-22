<script setup lang="ts">
import EyeIcon from '@/components/icons/EyeIcon.vue'
import MegaphoneIcon from '@/components/icons/MegaphoneIcon.vue'

interface ReviewPrPackageBlockProps {
  /** Package title (e.g. "Media Reputation"). */
  title: string
}

defineProps<ReviewPrPackageBlockProps>()

const emit = defineEmits<{
  view: []
}>()
</script>

<template>
  <div class="review-pr-package-block flex items-start gap-2">
    <div class="review-pr-package-block__icon size-5 shrink-0 text-[#5B5B62]">
      <MegaphoneIcon class="size-5 text-[#5B5B62]" />
    </div>
    <div class="review-pr-package-block__content flex-1 min-w-0 flex items-start justify-between gap-4">
      <p class="review-pr-package-block__title text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
        {{ title }}
      </p>
      <button
        type="button"
        class="review-pr-package-block__view-button inline-flex shrink-0 items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
        @click="emit('view')"
      >
        <EyeIcon />
        Переглянути
      </button>
    </div>
  </div>
</template>
