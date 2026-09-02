<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { resolveUiFooterClasses, type UiFooterLayout } from '@/components/ui/uiFooter'

/**
 * Kit footer — Figma `3984:7719` (bar) and `4463:9161` (stack). Geometry and
 * the reason both shapes live in one component: `uiFooter.ts`.
 *
 * Two ways to fill it, on purpose:
 *
 * - the **preset pair** (props below) covers the twelve places that are a
 *   cancel + primary pair — the nine edit-flow views, the wizard footer and the
 *   CEO review actions. They pass labels, not buttons;
 * - the **default slot** replaces the pair for the one place that is not a pair
 *   (`AuthorActionsFooter`: submit, back, share, PDF).
 *
 * The pair swaps order with the shape, because the mockup does: a bar reads
 * left-to-right (Назад · Далі), a stack puts the primary action on top
 * (На погодження CEO над Назад). DOM order follows the visual order, so tab
 * order does too.
 *
 * `kit` on the buttons lives here rather than at the call sites — DP-15258
 * phase 4 took it off `BriefShellView` and `EditFlowFooter` that way. The flag
 * itself dies in phase 10 with the last pre-kit modal.
 */
type UiFooterAction = 'cancel' | 'primary'

interface UiFooterProps {
  /** `bar` — wizard and edit flow. `stack` — review actions column. */
  layout?: UiFooterLayout
  showCancel?: boolean
  cancelLabel?: string
  cancelDisabled?: boolean
  showPrimary?: boolean
  primaryLabel?: string
  primaryDisabled?: boolean
  /** Puts the primary button in its loading state and locks the cancel one. */
  loading?: boolean
  loadingLabel?: string
}

const props = withDefaults(defineProps<UiFooterProps>(), {
  layout: 'bar',
  showCancel: true,
  cancelLabel: 'Скасувати',
  cancelDisabled: false,
  showPrimary: true,
  primaryLabel: 'Зберегти',
  primaryDisabled: false,
  loading: false,
  loadingLabel: 'Збереження…',
})

const emit = defineEmits<{
  cancel: []
  primary: []
}>()

const classes = computed(() => resolveUiFooterClasses(props.layout))

const pair = computed(() => {
  const cancel = {
    role: 'cancel' as UiFooterAction,
    variant: 'secondary' as const,
    label: props.cancelLabel,
    disabled: props.cancelDisabled || props.loading,
    loading: false,
    show: props.showCancel,
  }

  const primary = {
    role: 'primary' as UiFooterAction,
    variant: 'primary' as const,
    label: props.primaryLabel,
    disabled: props.primaryDisabled,
    loading: props.loading,
    show: props.showPrimary,
  }

  const ordered = props.layout === 'stack' ? [primary, cancel] : [cancel, primary]

  return ordered.filter(button => button.show)
})

function onAction(role: UiFooterAction) {
  if (role === 'primary') {
    emit('primary')
    return
  }
  emit('cancel')
}
</script>

<template>
  <div :class="[classes.root, loading ? 'ui-footer--loading' : '']">
    <div :class="classes.actions">
      <!--
        Presence of the slot decides, not what it renders: a shell that passes
        its own buttons and hides all of them (the approved review with no PDF)
        must render an empty footer, not fall back to a stray Скасувати/Зберегти
        pair — which is exactly what a plain `<slot>` fallback would do.
      -->
      <slot v-if="$slots.default" />
      <template v-else>
        <UiButton
          v-for="button in pair"
          :key="button.role"
          kit
          size="L"
          :variant="button.variant"
          :block="layout === 'bar'"
          :disabled="button.disabled"
          :loading="button.loading"
          :loading-label="loadingLabel"
          @click="onAction(button.role)"
        >
          <template v-if="$slots[`${button.role}-icon`]" #icon-left="{ iconClass }">
            <slot :name="`${button.role}-icon`" :icon-class="iconClass" />
          </template>
          {{ button.label }}
        </UiButton>
      </template>
    </div>

    <slot name="note" />
  </div>
</template>
