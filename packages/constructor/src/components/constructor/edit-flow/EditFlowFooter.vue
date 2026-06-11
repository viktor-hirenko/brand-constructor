<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
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
    <UiButton
      variant="secondary"
      block
      :disabled="loading"
      @click="emit('cancel')"
    >
      {{ cancelLabel }}
    </UiButton>
    <UiButton
      variant="primary"
      block
      :disabled="primaryDisabled"
      :loading="loading"
      loading-label="Збереження…"
      @click="emit('primary')"
    >
      {{ primaryLabel }}
    </UiButton>
  </div>
</template>
