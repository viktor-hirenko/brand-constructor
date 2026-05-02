<script setup lang="ts">
interface ReviewSectionRowProps {
  label: string
  value: string
}

defineProps<ReviewSectionRowProps>()
</script>

<template>
  <div class="flex items-start gap-7">
    <div v-if="$slots.icon" class="size-5 shrink-0 mt-1 text-muted-foreground">
      <slot name="icon" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-muted-foreground leading-4 mb-1">{{ label }}</p>
      <p class="text-base text-foreground tracking-[-0.31px] whitespace-pre-line">{{ value }}</p>
    </div>
  </div>
</template>
