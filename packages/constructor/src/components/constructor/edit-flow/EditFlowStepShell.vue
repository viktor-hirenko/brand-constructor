<script setup lang="ts">
import {
  LEFT_PANE_SCROLL_GUTTER_CLASS,
  LEFT_PANE_SCROLL_INNER_CLASS,
  LEFT_PANE_SCROLL_TRACK_CLASS,
} from '@/components/constructor/layout/dualPaneLayoutClasses'
import UiStepHeader from '@/components/ui/UiStepHeader.vue'

/**
 * Shared chrome for CEO re-select and PO edit step screens — outer flex column,
 * scrollable body, identical header (title + subtitle). Body goes into the
 * default slot, footer into the `#footer` slot.
 *
 * Edit mode: dual-pane column has no horizontal padding; scroll body applies
 * LEFT_PANE_SCROLL_GUTTER_CLASS. Dividers and footer border span the full column.
 *
 * The shell carries no async state of its own: DP-15258 phase 5 found the
 * spinner and error branches unreachable (none of the 8 call sites ever
 * passed them) and removed them. Views drop `ui/UiAsyncState.vue` into the
 * default slot instead.
 */
interface EditFlowStepShellProps {
  title: string
  subtitle?: string
}

withDefaults(defineProps<EditFlowStepShellProps>(), {
  subtitle: '',
})
</script>

<template>
  <div class="edit-flow-step-shell flex h-full min-h-0 w-full flex-col">
    <div
      :class="[
        'edit-flow-step-shell__body min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
        LEFT_PANE_SCROLL_TRACK_CLASS,
        LEFT_PANE_SCROLL_GUTTER_CLASS,
      ]"
    >
      <div
        :class="[
          'edit-flow-step-shell__inset flex flex-col gap-6 pb-8',
          LEFT_PANE_SCROLL_INNER_CLASS,
        ]"
      >
        <UiStepHeader
          class="edit-flow-step-shell__header"
          :title="title"
          :description="subtitle"
        />

        <slot />
      </div>
    </div>

    <div class="edit-flow-step-shell__footer-slot w-full shrink-0">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
/**
 * Pull dividers out of the 32px inset so the rule spans the full left column.
 * Matches `EDIT_FLOW_CONTENT_INSET_CLASS` (2rem × 2 = 4rem).
 */
.edit-flow-step-shell__inset :deep(.edit-flow-divider) {
  margin-left: -2rem;
  margin-right: -2rem;
  width: calc(100% + 4rem);
  max-width: none;
}
</style>
