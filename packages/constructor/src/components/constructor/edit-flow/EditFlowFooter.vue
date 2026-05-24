<script setup lang="ts">
import { EDIT_FLOW_CONTENT_INSET_CLASS } from '@/constants/editFlowLayout'

/**
 * Footer for CEO re-select and PO edit — border spans full column; buttons keep 48px inset.
 */
interface EditFlowFooterProps {
  cancelLabel?: string
  primaryLabel?: string
  primaryDisabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<EditFlowFooterProps>(), {
  cancelLabel: 'Скасувати',
  primaryLabel: 'Зберегти',
  primaryDisabled: false,
  loading: false,
})

const emit = defineEmits<{
  cancel: []
  primary: []
}>()
</script>

<template>
  <div
    :class="[
      'edit-flow-footer flex w-full min-w-0 shrink-0 items-center gap-2 border-t border-black/10 bg-[#f9f9fb] py-6',
      EDIT_FLOW_CONTENT_INSET_CLASS,
      loading ? 'edit-flow-footer--loading' : '',
    ]"
  >
    <button
      type="button"
      class="edit-flow-footer__cancel flex-1 rounded-[8px] border border-black/10 bg-white p-3 text-[16px] font-medium leading-6 tracking-[-0.3125px] text-[#0a0a0a] hover:bg-black/[0.02] transition-colors disabled:opacity-40"
      :disabled="loading"
      @click="emit('cancel')"
    >
      {{ cancelLabel }}
    </button>
    <button
      type="button"
      class="edit-flow-footer__primary flex-1 rounded-[8px] bg-[#030213] p-3 text-[16px] font-medium leading-6 tracking-[-0.3125px] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="primaryDisabled || loading"
      @click="emit('primary')"
    >
      {{ loading ? 'Збереження…' : primaryLabel }}
    </button>
  </div>
</template>
