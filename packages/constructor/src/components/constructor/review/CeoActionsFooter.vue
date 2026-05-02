<script setup lang="ts">
interface CeoActionsFooterProps {
  loading?: boolean
  /** Validation message ("Додайте хоча б один коментар…"). When set the revise button is highlighted. */
  warning?: string | null
  /** Whether to show the approve button (hidden in needs_revision after CEO already returned the brief). */
  showApprove?: boolean
  /** Whether to show the revise button (hidden in approved). */
  showRevise?: boolean
}

withDefaults(defineProps<CeoActionsFooterProps>(), {
  loading: false,
  warning: null,
  showApprove: true,
  showRevise: true,
})

const emit = defineEmits<{
  approve: []
  revise: []
}>()
</script>

<template>
  <div class="space-y-3">
    <button
      v-if="showApprove"
      type="button"
      class="w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#030213] text-white text-base font-medium hover:opacity-90 transition-all disabled:opacity-50"
      :disabled="loading"
      @click="emit('approve')"
    >
      <svg
        class="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{{ loading ? 'Зачекайте...' : 'Затвердити' }}</span>
    </button>

    <button
      v-if="showRevise"
      type="button"
      :class="[
        'w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl border text-base font-medium transition-all disabled:opacity-50',
        warning
          ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-black/10 text-foreground hover:bg-black/[0.02]',
      ]"
      :disabled="loading"
      @click="emit('revise')"
    >
      <svg
        class="size-5"
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
      <span>Повернути на доопрацювання</span>
    </button>

    <p v-if="warning" class="text-sm text-amber-700 flex items-center gap-2" role="alert">
      <svg
        class="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span>{{ warning }}</span>
    </p>
  </div>
</template>
