<script setup lang="ts">
interface ReviewSectionRowProps {
  label: string
  value: string
}

defineProps<ReviewSectionRowProps>()
</script>

<template>
  <div class="review-section-row flex items-start gap-2">
    <div v-if="$slots.icon" class="review-section-row__icon size-5 shrink-0 text-[#5B5B62]">
      <slot name="icon" />
    </div>
    <div class="review-section-row__content flex-1 min-w-0 flex flex-col gap-1">
      <p class="review-section-row__label text-[14px] font-medium leading-4 text-[#5B5B62]">
        {{ label }}
      </p>
      <p
        class="review-section-row__value text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A] whitespace-pre-line"
      >
        {{ value }}
      </p>
    </div>
  </div>
</template>
