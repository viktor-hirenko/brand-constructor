<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { BRIEF_FORM_DISCARD_CONFIRM_COPY } from '@/components/constructor/modals/briefFormDiscard'

/**
 * Form modal: a brief order form, or the read-only preview of one.
 *
 * Since DP-15258 phase 6 the shell itself is `UiModal`; this component keeps
 * only what is specific to a brief form — the save/edit footer and the
 * read-only mode. Its four call sites (`NewConceptModal`, `NewNamingModal`,
 * `NewInternalNamingModal`, `PrPackagePreviewPopup`) are unchanged.
 *
 * **Width is no longer a prop.** All five modal frames the designer published on
 * 2026-09-15 (`5562:49171` and siblings) draw the brief form at 560, the width
 * only the internal-naming modal used to ask for. The concept and external
 * naming forms were 672 and are now 560 with the rest.
 *
 * **A changed form does not close on a stray click — DP-15450 `Concept
 * Selection 7`.** Her words: «Не закривати модалку по кліку на overlay, якщо
 * форма змінена. При закритті через × / «Скасувати» показувати підтвердження
 * про втрату незбережених даних». So with `dirty` the backdrop does nothing,
 * and ×, «Скасувати» and Esc ask first. An untouched form closes as before.
 * Each form decides what "changed" means — it alone knows its initial values.
 */
interface BriefModalShellProps {
  title: string
  isValid?: boolean
  /**
   * Read-only mode: shell renders the form (slot) as disabled and replaces
   * the «Зберегти» action with optional «Редагувати». Used by brief preview
   * overlays that reuse `New*Modal` components without duplicating markup.
   */
  readonly?: boolean
  /** Show «Редагувати» primary action in read-only mode. */
  showEditAction?: boolean
  /** The form differs from what it opened with. Ignored in read-only mode. */
  dirty?: boolean
}

const props = withDefaults(defineProps<BriefModalShellProps>(), {
  isValid: true,
  readonly: false,
  showEditAction: false,
  dirty: false,
})

const emit = defineEmits<{
  cancel: []
  save: []
  edit: []
}>()

/** Whether the modal footer is shown (edit: cancel/save; read-only: edit action only, or none). */
const showFooter = computed(() => !props.readonly || props.showEditAction)

const guarded = computed(() => props.dirty && !props.readonly)
const discardConfirmOpen = ref(false)

/**
 * Every way out but «Зберегти» comes through here. While the question is up,
 * the Esc that reaches this shell as well is ignored: the question's own Esc
 * closes the question, not the form under it.
 */
function requestCancel(): void {
  if (discardConfirmOpen.value) return
  if (guarded.value) {
    discardConfirmOpen.value = true
    return
  }
  emit('cancel')
}

function discard(): void {
  discardConfirmOpen.value = false
  emit('cancel')
}
</script>

<template>
  <UiModal
    :title="title"
    size="md"
    :close-on-backdrop="!guarded"
    @close="requestCancel"
  >
    <slot />

    <template v-if="showFooter" #footer>
      <UiButton v-if="!readonly" size="L" variant="secondary" @click="requestCancel">
        Скасувати
      </UiButton>
      <UiButton
        v-if="!readonly"
        size="L"
        variant="primary"
        :disabled="!isValid"
        @click="emit('save')"
      >
        Зберегти
      </UiButton>
      <UiButton
        v-else-if="showEditAction"
        size="L"
        variant="primary"
        @click="emit('edit')"
      >
        Редагувати
      </UiButton>
    </template>
  </UiModal>

  <ConfirmationModal
    v-if="discardConfirmOpen"
    :title="BRIEF_FORM_DISCARD_CONFIRM_COPY.title"
    :body="BRIEF_FORM_DISCARD_CONFIRM_COPY.body"
    :cancel-label="BRIEF_FORM_DISCARD_CONFIRM_COPY.cancelLabel"
    :primary-label="BRIEF_FORM_DISCARD_CONFIRM_COPY.primaryLabel"
    @cancel="discardConfirmOpen = false"
    @primary="discard"
  />
</template>
