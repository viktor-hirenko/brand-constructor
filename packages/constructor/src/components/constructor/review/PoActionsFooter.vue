<script setup lang="ts">
import CheckIcon from '@/components/icons/CheckIcon.vue'
import DownloadIcon from '@/components/icons/DownloadIcon.vue'
import LoaderIcon from '@/components/icons/LoaderIcon.vue'
import ShareIcon from '@/components/icons/ShareIcon.vue'

interface PoActionsFooterProps {
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

withDefaults(defineProps<PoActionsFooterProps>(), {
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
  <div :class="['po-actions-footer space-y-3', loading ? 'po-actions-footer--loading' : '']">
    <button
      v-if="showSubmit"
      type="button"
      class="po-actions-footer__submit w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#030213] text-white text-base font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading || submitDisabled"
      @click="emit('submit')"
    >
      <span>{{ loading ? 'Відправляємо…' : submitLabel }}</span>
    </button>

    <button
      v-if="showBack"
      type="button"
      class="po-actions-footer__back w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl border border-black/10 text-base font-medium text-foreground transition-all hover:bg-black/[0.02]"
      @click="emit('back')"
    >
      Назад
    </button>

    <button
      v-if="showShare"
      type="button"
      class="po-actions-footer__share w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#f3f3f5] text-foreground rounded-xl hover:bg-[#ececf0] transition-colors text-base font-medium disabled:opacity-50"
      @click="emit('share')"
    >
      <CheckIcon v-if="shareCopied" class="size-5 text-green-600" />
      <ShareIcon v-else class="size-5" />
      {{ shareCopied ? 'Скопійовано!' : 'Share' }}
    </button>

    <button
      v-if="showPdf"
      type="button"
      class="po-actions-footer__pdf w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#030213] text-white text-base font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="pdfLoading"
      @click="emit('pdf')"
    >
      <DownloadIcon v-if="!pdfLoading" class="size-4" />
      <LoaderIcon v-else class="size-4 animate-spin" />
      {{ pdfLoading ? 'Генерація PDF…' : 'Завантажити PDF' }}
    </button>
  </div>
</template>
