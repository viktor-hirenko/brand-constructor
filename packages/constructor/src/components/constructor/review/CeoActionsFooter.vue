<script setup lang="ts">
import CheckIcon from '@/components/icons/CheckIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'

interface CeoActionsFooterProps {
  loading?: boolean
  /** Validation message ("Додайте хоча б один коментар…"). When set the revise button is highlighted. */
  warning?: string | null
  /** Whether to show the approve button (hidden in needs_revision after CEO already returned the brief). */
  showApprove?: boolean
  /** Whether to show the revise button (hidden in approved). */
  showRevise?: boolean
}

withDefaults(defineProps<CeoActionsFooterProps>(), {
  loading: false,
  warning: null,
  showApprove: true,
  showRevise: true,
})

const emit = defineEmits<{
  approve: []
  revise: []
}>()
</script>

<template>
  <div
    :class="[
      'ceo-actions-footer space-y-3',
      loading ? 'ceo-actions-footer--loading' : '',
      warning ? 'ceo-actions-footer--has-warning' : '',
    ]"
  >
    <button
      v-if="showApprove"
      type="button"
      class="ceo-actions-footer__approve w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#030213] text-white text-base font-medium hover:opacity-90 transition-all disabled:opacity-50"
      :disabled="loading"
      @click="emit('approve')"
    >
      <CheckIcon class="size-5 shrink-0 text-white" />
      <span>{{ loading ? 'Зачекайте...' : 'Затвердити' }}</span>
    </button>

    <button
      v-if="showRevise"
      type="button"
      class="ceo-actions-footer__revise w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl border border-black/10 text-base font-medium text-foreground transition-all hover:bg-black/[0.02] disabled:opacity-50"
      :disabled="loading"
      @click="emit('revise')"
    >
      <RefreshIcon class="size-5 shrink-0 text-[#0A0A0A]" />
      <span>Повернути на доопрацювання</span>
    </button>

    <p
      v-if="warning"
      class="ceo-actions-footer__warning flex items-center justify-center gap-2 text-[16px] font-normal leading-6 tracking-[-0.312px] text-[rgba(10,10,10,0.80)]"
      role="alert"
    >
      <InfoCircleFilledIcon class="size-5 shrink-0 text-[#C97D00]" />
      <span>{{ warning }}</span>
    </p>
  </div>
</template>
