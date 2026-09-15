<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

/**
 * Form modal: a brief order form, or the read-only preview of one.
 *
 * Since DP-15258 phase 6 the shell itself is `UiModal`; this component keeps
 * only what is specific to a brief form — the save/edit footer and the
 * read-only mode. Its four call sites (`NewConceptModal`, `NewNamingModal`,
 * `NewInternalNamingModal`, `PrPackagePreviewPopup`) are unchanged.
 *
 * The backdrop still closes the modal, as it did before the phase. It is a
 * questionable affordance over a half-filled brief — one stray click drops the
 * typed answers — but changing it is a behaviour change the phase was not asked
 * to make. `UiModal` already carries the `close-on-backdrop` switch for the day
 * someone decides otherwise.
 */
interface BriefModalShellProps {
  title: string
  isValid?: boolean
  /** 'lg' = 672px wide (default); 'md' = 560px. */
  size?: 'md' | 'lg'
  /**
   * Read-only mode: shell renders the form (slot) as disabled and replaces
   * the «Зберегти» action with optional «Редагувати». Used by brief preview
   * overlays that reuse `New*Modal` components without duplicating markup.
   */
  readonly?: boolean
  /** Show «Редагувати» primary action in read-only mode. */
  showEditAction?: boolean
}

const props = withDefaults(defineProps<BriefModalShellProps>(), {
  isValid: true,
  size: 'lg',
  readonly: false,
  showEditAction: false,
})

const emit = defineEmits<{
  cancel: []
  save: []
  edit: []
}>()

/** Whether the modal footer is shown (edit: cancel/save; read-only: edit action only, or none). */
const showFooter = computed(() => !props.readonly || props.showEditAction)
</script>

<template>
  <UiModal :title="title" :size="props.size" @close="emit('cancel')">
    <slot />

    <template v-if="showFooter" #footer>
      <UiButton v-if="!readonly" kit size="L" variant="secondary" @click="emit('cancel')">
        Скасувати
      </UiButton>
      <UiButton
        v-if="!readonly"
        kit
        size="L"
        variant="primary"
        :disabled="!isValid"
        @click="emit('save')"
      >
        Зберегти
      </UiButton>
      <UiButton
        v-else-if="showEditAction"
        kit
        size="L"
        variant="primary"
        @click="emit('edit')"
      >
        Редагувати
      </UiButton>
    </template>
  </UiModal>
</template>
