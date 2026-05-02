<script setup lang="ts">
interface ReviewSectionProps {
  title: string
  /** Render the "Змінити вибір" button in the header. */
  changeChoice?: boolean
  /** Highlight the section (amber border) when validation requires action here. */
  highlighted?: boolean
}

withDefaults(defineProps<ReviewSectionProps>(), {
  changeChoice: false,
  highlighted: false,
})

const emit = defineEmits<{
  change: []
}>()
</script>

<template>
  <section
    :class="[
      'rounded-xl border bg-white transition-colors',
      highlighted ? 'border-amber-400 ring-2 ring-amber-200' : 'border-black/10',
    ]"
  >
    <header class="flex items-center justify-between h-14 pl-4 pr-2">
      <h3 class="text-base font-medium tracking-[-0.31px] text-foreground">{{ title }}</h3>
      <button
        v-if="changeChoice"
        type="button"
        class="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-black/10 text-sm font-medium hover:bg-black/[0.03] transition-colors"
        @click="emit('change')"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        Змінити вибір
      </button>
    </header>
    <hr class="border-t border-black/10" />
    <div class="p-4 space-y-4">
      <slot />
      <slot name="comment" />
    </div>
  </section>
</template>
