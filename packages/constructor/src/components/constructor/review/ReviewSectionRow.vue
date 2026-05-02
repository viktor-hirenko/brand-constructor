<script setup lang="ts">
interface ReviewSectionRowProps {
  label: string
  value: string
}

defineProps<ReviewSectionRowProps>()
</script>

<template>
  <div class="flex items-start gap-2">
    <div v-if="$slots.icon" class="size-5 shrink-0 text-[#5B5B62]">
      <slot name="icon" />
    </div>
    <div class="flex-1 min-w-0 flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">{{ label }}</p>
      <p
        class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A] whitespace-pre-line"
      >
        {{ value }}
      </p>
    </div>
  </div>
</template>
