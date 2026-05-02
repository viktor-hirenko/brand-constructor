<script setup lang="ts">
interface ReviewVisualComponentsBlockProps {
  /** Comma-separated list or generic label. */
  summary: string
  /** Optional total count (rendered separately). */
  count?: number | null
}

withDefaults(defineProps<ReviewVisualComponentsBlockProps>(), {
  count: null,
})
</script>

<template>
  <div class="flex items-start gap-7">
    <div class="size-5 shrink-0 mt-1 text-muted-foreground">
      <svg
        class="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-muted-foreground leading-4 mb-1">Обрані компоненти</p>
      <p class="text-base text-foreground tracking-[-0.31px]">{{ summary }}</p>
      <p v-if="count !== null" class="text-sm text-muted-foreground mt-0.5">
        Усього: {{ count }} {{ count === 1 ? 'компонент' : 'компонентів' }}
      </p>
    </div>
  </div>
</template>
