<script setup lang="ts">
interface ReviewDeliverablesBlockProps {
  /** "Brief", "Brief + Mockup", … */
  scope: string
  /** Plain language description of timing (e.g. "до 7 робочих днів"). */
  timing: string
}

defineProps<ReviewDeliverablesBlockProps>()
</script>

<template>
  <div class="space-y-4">
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-muted-foreground leading-4 mb-1">Що отримуємо</p>
        <p class="text-base text-foreground tracking-[-0.31px]">{{ scope }}</p>
      </div>
    </div>

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
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-muted-foreground leading-4 mb-1">Терміни</p>
        <p class="text-base text-foreground tracking-[-0.31px]">{{ timing }}</p>
      </div>
    </div>
  </div>
</template>
