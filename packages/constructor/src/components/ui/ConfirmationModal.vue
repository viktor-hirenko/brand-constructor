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
        class="confirmation-modal__text whitespace-pre-line text-base font-normal text-ink-700"
      >
        {{ body }}
      </p>

      <!--
        Row: two equal columns, not two `block` (flex-1) buttons — with a basis
        of 0 the bordered «Скасувати» took 198 and the primary 196; the kit
        draws 197 + 8 + 197 (`1985:4936`). Labels never wrap: «Редагувати
        концепт» renders 159 in the browser (155 in Figma) and broke into two
        lines in 156. The stack is a grid too: a column of `flex-1` buttons
        let the bordered one grow to 50. Owner 30.09.
      -->
      <div
        :class="[
          'confirmation-modal__actions w-full gap-2 whitespace-nowrap',
          actionsLayout === 'stack' ? 'grid grid-cols-1' : 'grid grid-cols-2',
        ]"
      >
        <UiButton
          size="L"
          variant="secondary"
          block
          :disabled="primaryLoading"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </UiButton>
        <UiButton
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
