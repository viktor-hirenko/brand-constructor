<script setup lang="ts">
import CheckIcon from '@/components/icons/CheckIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'
import UiFooter from '@/components/ui/UiFooter.vue'

/**
 * Supervisor (CEO) review actions — the stack shape of the kit footer,
 * Figma `4378:16948`: primary on top, secondary below, note under both.
 *
 * Approve maps onto the footer's primary action and revise onto its cancel one,
 * so this file carries no button markup — only the two icons and the warning.
 * The warning keeps its current 16/24 amber rendering; the mockup draws it red
 * 14/16 with a 16px icon, which is written up in the task document rather than
 * changed here, because it is an alert, not footer geometry.
 */
interface SupervisorActionsFooterProps {
  loading?: boolean
  /** Validation message ("Додайте хоча б один коментар…"). When set the revise button is highlighted. */
  warning?: string | null
  /** Whether to show the approve button (hidden in needs_revision after CEO already returned the brief). */
  showApprove?: boolean
  /** Whether to show the revise button (hidden in approved). */
  showRevise?: boolean
}

withDefaults(defineProps<SupervisorActionsFooterProps>(), {
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
  <UiFooter
    layout="stack"
    :class="[
      'ceo-actions-footer',
      loading ? 'ceo-actions-footer--loading' : '',
      warning ? 'ceo-actions-footer--has-warning' : '',
    ]"
    :show-primary="showApprove"
    primary-label="Затвердити"
    loading-label="Зачекайте..."
    :loading="loading"
    :show-cancel="showRevise"
    cancel-label="Повернути на доопрацювання"
    @primary="emit('approve')"
    @cancel="emit('revise')"
  >
    <template #primary-icon="{ iconClass }">
      <CheckIcon :class="iconClass" />
    </template>

    <template #cancel-icon="{ iconClass }">
      <RefreshIcon :class="iconClass" />
    </template>

    <template #note>
      <p
        v-if="warning"
        class="ceo-actions-footer__warning flex items-center justify-center gap-2 text-[1rem] font-normal leading-6 tracking-[-0.312px] text-[rgba(10,10,10,0.80)]"
        role="alert"
      >
        <InfoCircleFilledIcon class="size-5 shrink-0 text-[#DCA100]" />
        <span>{{ warning }}</span>
      </p>
    </template>
  </UiFooter>
</template>
