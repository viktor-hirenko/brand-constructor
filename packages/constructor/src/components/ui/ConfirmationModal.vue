<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

/**
 * Yes/no dialog — the shape the wizard asks a question in.
 *
 * Since DP-15258 phase 6 this is a thin composition over `UiModal`; the API is
 * unchanged, so its nine call sites (steps 2/3/4 and the review screen) did not
 * move. The actions live in the body, not in the modal footer: a confirmation
 * has no second rule above its buttons, and that is what the two inline shells
 * of step 5 and step 7 were unified onto.
 */
interface ConfirmationModalProps {
  title: string
  body: string
  cancelLabel?: string
  primaryLabel: string
  primaryLoading?: boolean
  /** `row` — side-by-side (default). `stack` — full-width buttons in a column. */
  actionsLayout?: 'row' | 'stack'
}

withDefaults(defineProps<ConfirmationModalProps>(), {
  cancelLabel: 'Скасувати',
  primaryLoading: false,
  actionsLayout: 'row',
})

const emit = defineEmits<{
  cancel: []
  primary: []
}>()
</script>

<template>
  <UiModal :title="title" size="sm" @close="emit('cancel')">
    <div class="confirmation-modal__content flex flex-col gap-6">
      <p
        class="confirmation-modal__text whitespace-pre-line text-base font-normal tracking-[-0.3125px] text-ink-700"
      >
        {{ body }}
      </p>

      <div
        :class="[
          'confirmation-modal__actions flex w-full items-stretch gap-2',
          actionsLayout === 'stack' ? 'flex-col' : 'flex-row',
        ]"
      >
        <UiButton
          kit
          size="L"
          variant="secondary"
          block
          :disabled="primaryLoading"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </UiButton>
        <UiButton
          kit
          size="L"
          variant="primary"
          block
          :loading="primaryLoading"
          @click="emit('primary')"
        >
          {{ primaryLabel }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>
