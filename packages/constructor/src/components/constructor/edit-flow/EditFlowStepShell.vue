<script setup lang="ts">
/**
 * Shared chrome for CEO re-select and PO edit step screens — outer flex column,
 * scrollable body, identical header (title + subtitle). Body goes into the
 * default slot, footer into the `#footer` slot.
 *
 * Pass `loading` / `error` + listen to `retry` to centralise the full-body
 * async boundary that is shared across all 6 edit/reselect views.
 * When `loading` is true or `error` is non-null the default slot is replaced
 * with the spinner / error-retry UI; the `#footer` slot is always rendered.
 */
interface EditFlowStepShellProps {
  title: string
  subtitle?: string
  /** When true, renders a full-body spinner instead of the default slot. */
  loading?: boolean
  /** When set, renders an error message with a retry button instead of the default slot. */
  error?: string | null
}

withDefaults(defineProps<EditFlowStepShellProps>(), {
  subtitle: '',
  loading: false,
  error: null,
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="edit-flow-step-shell flex flex-col h-full min-h-0">
    <div class="edit-flow-step-shell__body flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pr-2 pb-4">
      <div>
        <h1
          class="edit-flow-step-shell__title text-2xl font-medium text-[#0a0a0a] tracking-[0.0703px] mb-2 leading-8"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="edit-flow-step-shell__subtitle text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]"
        >
          {{ subtitle }}
        </p>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
      <div v-else-if="error" class="text-center py-12 text-red-500">
        <p class="mb-3">{{ error }}</p>
        <button
          type="button"
          class="text-primary underline text-sm"
          @click="emit('retry')"
        >
          Спробувати знову
        </button>
      </div>
      <slot v-else />
    </div>
    <div class="edit-flow-step-shell__footer-slot">
      <slot name="footer" />
    </div>
  </div>
</template>
