<script setup lang="ts">
interface PoActionsFooterProps {
  loading?: boolean
  /** Primary submit label (depends on new brief vs standard submit). */
  submitLabel?: string
  /**
   * Hard-disables the submit button regardless of loading state.
   * Used in returned-from-CEO view when attention counter > 0.
   */
  submitDisabled?: boolean
  /** Secondary actions — typically false in draft. */
  showShare?: boolean
  showPdf?: boolean
  shareCopied?: boolean
  pdfLoading?: boolean
}

withDefaults(defineProps<PoActionsFooterProps>(), {
  loading: false,
  submitLabel: 'Відправити на розгляд',
  submitDisabled: false,
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
  <div class="space-y-3">
    <button
      type="button"
      class="w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#030213] text-white text-base font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading || submitDisabled"
      @click="emit('submit')"
    >
      <svg
        class="size-5 shrink-0 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </svg>
      <span>{{ loading ? 'Відправляємо…' : submitLabel }}</span>
    </button>

    <button
      type="button"
      class="w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl border border-black/10 text-base font-medium text-foreground transition-all hover:bg-black/[0.02]"
      @click="emit('back')"
    >
      Назад
    </button>

    <button
      v-if="showShare"
      type="button"
      class="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#f3f3f5] text-foreground rounded-xl hover:bg-[#ececf0] transition-colors text-base font-medium disabled:opacity-50"
      @click="emit('share')"
    >
      <svg
        v-if="shareCopied"
        class="size-5 text-green-600"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <svg
        v-else
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
      </svg>
      {{ shareCopied ? 'Скопійовано!' : 'Share' }}
    </button>

    <button
      v-if="showPdf"
      type="button"
      class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-black/10 text-foreground rounded-xl hover:bg-black/[0.02] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="pdfLoading"
      @click="emit('pdf')"
    >
      <svg
        v-if="!pdfLoading"
        class="size-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
      <svg
        v-else
        class="size-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {{ pdfLoading ? 'Генерація PDF…' : 'Завантажити PDF' }}
    </button>
  </div>
</template>
