<script setup lang="ts">
/**
 * Shared sticky footer for CEO re-select and PO edit step screens.
 * Replaces the byte-for-byte duplicate `CeoReselectFooter` + `PoEditFooter`.
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
      'edit-flow-footer sticky bottom-0 z-10 flex items-center gap-3 h-[97px] shrink-0 border-t border-black/10 bg-[#f9f9fb] px-1 pt-4 -mx-1',
      loading ? 'edit-flow-footer--loading' : '',
    ]"
  >
    <button
      type="button"
      class="edit-flow-footer__cancel flex-1 h-12 rounded-[10px] border border-black/10 text-[16px] font-medium text-[#030213] hover:bg-black/[0.02] transition-colors disabled:opacity-40"
      :disabled="loading"
      @click="emit('cancel')"
    >
      {{ cancelLabel }}
    </button>
    <button
      type="button"
      class="edit-flow-footer__primary flex-1 h-12 rounded-[10px] bg-[#030213] text-white text-[16px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="primaryDisabled || loading"
      @click="emit('primary')"
    >
      {{ loading ? 'Збереження…' : primaryLabel }}
    </button>
  </div>
</template>
