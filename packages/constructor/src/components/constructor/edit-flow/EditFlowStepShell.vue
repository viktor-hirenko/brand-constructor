<script setup lang="ts">
import { EDIT_FLOW_CONTENT_INSET_CLASS } from '@/constants/editFlowLayout'

/**
 * Shared chrome for CEO re-select and PO edit step screens — outer flex column,
 * scrollable body, identical header (title + subtitle). Body goes into the
 * default slot, footer into the `#footer` slot.
 *
 * Edit mode: dual-pane column has no horizontal padding; this shell applies
 * px-12 to scrollable content. Dividers and footer border span the full column.
 *
 * Pass `loading` / `error` + listen to `retry` to centralise the full-body
 * async boundary that is shared across all 6 edit/reselect views.
 */
interface EditFlowStepShellProps {
  title: string
  subtitle?: string
  loading?: boolean
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
  <div class="edit-flow-step-shell flex h-full min-h-0 w-full flex-col">
    <div
      class="edit-flow-step-shell__body min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
    >
      <div
        :class="[
          'edit-flow-step-shell__inset flex flex-col gap-6 pb-[32px]',
          EDIT_FLOW_CONTENT_INSET_CLASS,
        ]"
      >
        <div>
          <h1
            class="edit-flow-step-shell__title text-2xl font-medium leading-8 tracking-[0.0703px] text-[#0a0a0a] mb-2"
          >
            {{ title }}
          </h1>
          <p
            v-if="subtitle"
            class="edit-flow-step-shell__subtitle text-[16px] leading-6 tracking-[-0.3125px] text-[#717182]"
          >
            {{ subtitle }}
          </p>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16">
          <div
            class="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
        </div>
        <div v-else-if="error" class="py-12 text-center text-red-500">
          <p class="mb-3">{{ error }}</p>
          <button type="button" class="text-sm text-primary underline" @click="emit('retry')">
            Спробувати знову
          </button>
        </div>
        <slot v-else />
      </div>
    </div>

    <div class="edit-flow-step-shell__footer-slot w-full shrink-0">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
/**
 * Pull dividers out of the 48px inset so the rule spans the full left column.
 * Matches EDIT_FLOW_CONTENT_INSET_CLASS (3rem × 2 = 6rem).
 */
.edit-flow-step-shell__inset :deep(.edit-flow-divider) {
  margin-left: -3rem;
  margin-right: -3rem;
  width: calc(100% + 6rem);
  max-width: none;
}
</style>
