<script setup lang="ts">
import CloseIcon from '@/components/icons/CloseIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useEscapeClose } from '@/composables/useEscapeClose'

interface ConfirmationModalProps {
  title: string
  body: string
  cancelLabel?: string
  primaryLabel: string
  primaryLoading?: boolean
  /** `row` — side-by-side (default). `stack` — full-width buttons in a column. */
  actionsLayout?: 'row' | 'stack'
}

const props = withDefaults(defineProps<ConfirmationModalProps>(), {
  cancelLabel: 'Скасувати',
  primaryLoading: false,
  actionsLayout: 'row',
})

const emit = defineEmits<{
  cancel: []
  primary: []
}>()

useEscapeClose(() => emit('cancel'))

const titleId = 'confirmation-modal-title'
</script>

<template>
  <Teleport to="body">
    <div class="confirmation-modal fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        class="confirmation-modal__backdrop absolute inset-0 bg-black/50"
        @click="emit('cancel')"
      />

      <div
        class="confirmation-modal__dialog relative flex w-full max-w-[450px] flex-col rounded-[16px] bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] mx-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="confirmation-modal__header flex items-center gap-5 p-6">
          <h2
            :id="titleId"
            class="confirmation-modal__title flex-1 text-[20px] font-medium leading-6 tracking-[0.0703px] text-[#0a0a0a]"
          >
            {{ title }}
          </h2>
          <button
            type="button"
            class="confirmation-modal__close flex size-6 shrink-0 items-center justify-center rounded-md text-[#717182] transition-colors hover:bg-black/[0.04] hover:text-[#0a0a0a]"
            aria-label="Закрити"
            @click="emit('cancel')"
          >
            <CloseIcon class="size-5" />
          </button>
        </div>

        <div class="confirmation-modal__divider border-t border-black/10" />

        <div class="confirmation-modal__body flex flex-col gap-6 p-6">
          <p
            class="confirmation-modal__text whitespace-pre-line text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#717182]"
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
              variant="secondary"
              block
              :disabled="primaryLoading"
              @click="emit('cancel')"
            >
              {{ cancelLabel }}
            </UiButton>
            <UiButton
              variant="primary"
              block
              :loading="primaryLoading"
              @click="emit('primary')"
            >
              {{ primaryLabel }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
