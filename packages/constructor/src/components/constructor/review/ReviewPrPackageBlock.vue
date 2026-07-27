<script setup lang="ts">
import EyeIcon from '@/components/icons/EyeIcon.vue'
import MegaphoneIcon from '@/components/icons/MegaphoneIcon.vue'
import { REVIEW_PREVIEW_LINK_BUTTON_CLASS } from './reviewActionClasses'

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
  <div class="review-pr-package-block flex items-center gap-2">
    <div class="review-pr-package-block__icon size-5 shrink-0 text-[#5B5B62]">
      <MegaphoneIcon class="size-5 text-[#5B5B62]" />
    </div>
    <div class="review-pr-package-block__content flex-1 min-w-0 flex items-center justify-between gap-4">
      <p class="review-pr-package-block__title text-[1rem] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
        {{ title }}
      </p>
      <button
        type="button"
        :class="['review-pr-package-block__view-button', REVIEW_PREVIEW_LINK_BUTTON_CLASS]"
        @click="emit('view')"
      >
        <EyeIcon />
        Переглянути
      </button>
    </div>
  </div>
</template>
