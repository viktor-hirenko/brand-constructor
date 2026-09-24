<script setup lang="ts">
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import UiFooter from '@/components/ui/UiFooter.vue'

/**
 * Supervisor (CEO) review actions — the stack shape of the kit footer,
 * Figma `4378:16948`: primary on top, secondary below, note under both.
 *
 * Approve maps onto the footer's primary action and revise onto its cancel one,
 * so this file carries no button markup — only the warning under them.
 *
 * ── Measured on `5387:83845`, the drawn "comments required" screen ───────────
 * **The buttons carry no icon.** Both instances (`5387:83847`, `5387:83848`)
 * have `Icon left` *and* `Icon right` switched off; the check mark and the
 * return arrow that used to sit here were ours. Same lesson as step 7's magic
 * wand: the mapping table says what a glyph becomes, never whether a slot on a
 * screen holds one.
 *
 * **The warning is red, not amber.** `5387:83849` is a 16-tall centred row:
 * icon 16, `spacing/4` to the label, label `caption/l/regular` 14/16 with
 * letter-spacing 0, and one colour for both — `alert/icon/error` /
 * `badge/content/red` `#ce2c31`, which is `--color-red-content`. It used to be
 * 16/24 at `rgba(10,10,10,0.8)` with a 20px `#DCA100` glyph, and `#DCA100` is
 * in no kit palette. The 12 above the row is `UiFooter`'s own root gap.
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
    <template #note>
      <p
        v-if="warning"
        class="ceo-actions-footer__warning flex items-center justify-center gap-1 text-sm/4 font-normal text-red-content"
        role="alert"
      >
        <InfoCircleFilledIcon class="size-4 shrink-0" />
        <span>{{ warning }}</span>
      </p>
    </template>
  </UiFooter>
</template>
