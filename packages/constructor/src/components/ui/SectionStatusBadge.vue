<script setup lang="ts">
interface SectionStatusBadgeProps {
  /**
   * 'attention'  — "Потрібно обрати варіант" (amber dot + text)
   * 'applied'    — shown in section header after PO applied CEO choice (no badge)
   */
  variant: 'attention'
  label?: string
}

withDefaults(defineProps<SectionStatusBadgeProps>(), {
  label: 'Потрібно обрати варіант',
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
  >
    <span class="size-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
    {{ label }}
  </span>
</template>
