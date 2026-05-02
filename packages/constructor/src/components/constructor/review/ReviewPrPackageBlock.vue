<script setup lang="ts">
interface ReviewPrPackageBlockProps {
  /** Package title (e.g. "Promo package — Standard"). */
  title: string
  /** Optional descriptive subtitle (number of activities, etc.). */
  subtitle?: string
}

defineProps<ReviewPrPackageBlockProps>()

const emit = defineEmits<{
  view: []
}>()
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
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-muted-foreground leading-4 mb-1">PR пакет</p>
      <p class="text-base text-foreground tracking-[-0.31px]">{{ title }}</p>
      <p v-if="subtitle" class="text-sm text-muted-foreground mt-0.5">{{ subtitle }}</p>
      <button
        type="button"
        class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        @click="emit('view')"
      >
        Переглянути
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </svg>
      </button>
    </div>
  </div>
</template>
