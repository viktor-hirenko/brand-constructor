<script setup lang="ts">
import CheckIcon from '@/components/icons/CheckIcon.vue'
import DownloadIcon from '@/components/icons/DownloadIcon.vue'
import LoaderIcon from '@/components/icons/LoaderIcon.vue'
import ShareIcon from '@/components/icons/ShareIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiFooter from '@/components/ui/UiFooter.vue'

/**
 * Author (PO) review actions — the stack shape of the kit footer,
 * Figma `4463:9161`.
 *
 * This is the one footer that is not a cancel + primary pair, so it fills
 * `UiFooter`'s default slot with its own buttons instead of using the preset.
 * Share and PDF have no counterpart in the mockup at all — they are mapped onto
 * the nearest kit styles (`neutral` and `primary`) so that the column stays one
 * geometry: L-48, radius 8, 8 apart.
 */
interface AuthorActionsFooterProps {
  loading?: boolean
  /** Primary submit label (depends on new brief vs standard submit). */
  submitLabel?: string
  /**
   * Hard-disables the submit button regardless of loading state.
   * Used in returned-from-CEO view when attention counter > 0.
   */
  submitDisabled?: boolean
  /**
   * Whether to render the primary "submit" button at all.
   * Defaults to true to preserve existing PO flows. Pass false on the
   * approved read-only view where only Download PDF should remain.
   */
  showSubmit?: boolean
  /**
   * Whether to show the "Назад" button. Defaults to true (PO draft wizard flow).
   * Hidden in returned-from-CEO view where there is no wizard step to go back to.
   */
  showBack?: boolean
  /** Secondary actions — typically false in draft. */
  showShare?: boolean
  showPdf?: boolean
  shareCopied?: boolean
  pdfLoading?: boolean
}

withDefaults(defineProps<AuthorActionsFooterProps>(), {
  loading: false,
  submitLabel: 'На погодження CEO',
  submitDisabled: false,
  showSubmit: true,
  showBack: true,
  showShare: false,
  showPdf: false,
  shareCopied: false,
  pdfLoading: false,
})

const emit = defineEmits<{
  submit: []
  back: []
  share: []
  pdf: []
}>()
</script>

<template>
  <UiFooter
    layout="stack"
    :class="['po-actions-footer', loading ? 'po-actions-footer--loading' : '']"
  >
    <UiButton
      v-if="showSubmit"
      kit
      size="L"
      variant="primary"
      class="po-actions-footer__submit"
      :disabled="submitDisabled"
      :loading="loading"
      loading-label="Відправляємо…"
      @click="emit('submit')"
    >
      {{ submitLabel }}
    </UiButton>

    <UiButton
      v-if="showBack"
      kit
      size="L"
      variant="secondary"
      class="po-actions-footer__back"
      @click="emit('back')"
    >
      Назад
    </UiButton>

    <UiButton
      v-if="showShare"
      kit
      size="L"
      variant="neutral"
      class="po-actions-footer__share"
      @click="emit('share')"
    >
      <template #icon-left="{ iconClass }">
        <CheckIcon v-if="shareCopied" :class="[iconClass, 'text-green-600']" />
        <ShareIcon v-else :class="iconClass" />
      </template>
      {{ shareCopied ? 'Скопійовано!' : 'Share' }}
    </UiButton>

    <UiButton
      v-if="showPdf"
      kit
      size="L"
      variant="primary"
      class="po-actions-footer__pdf"
      :loading="pdfLoading"
      loading-label="Генерація PDF…"
      @click="emit('pdf')"
    >
      <template #icon-left="{ iconClass }">
        <DownloadIcon v-if="!pdfLoading" :class="iconClass" />
        <LoaderIcon v-else :class="[iconClass, 'animate-spin']" />
      </template>
      Завантажити PDF
    </UiButton>
  </UiFooter>
</template>
