<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import { resolveUiModalClasses, type UiModalSize } from '@/components/ui/uiModal'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import { useEscapeClose } from '@/composables/useEscapeClose'

/**
 * The one modal shell of the wizard — DP-15258 phase 6.
 *
 * Assembled from kit parts rather than copied from a node: the kit has no modal
 * (open question 6). The reasoning, the geometry and the unit rules live in
 * `ui/uiModal.ts`; this file is only markup.
 *
 * **`Teleport to="body"` is not decoration.** The wizard shell scales itself
 * with `transform` and clips with `overflow-hidden`; a dialog rendered inside it
 * would be scaled twice and cut off. Teleporting also makes `max-h-[85vh]` mean
 * "85% of the admin panel", which is what lets a long modal scroll. Do not lift
 * this back into the shell — see "Железные правила адаптива" in
 * `docs/design-audit/dp-15258-ui-kit.md`.
 *
 * Visibility is the caller's business (`v-if`), as it was in all four shells:
 * the component mounts when it should be seen, which is also what arms the Esc
 * handler and the background scroll lock.
 */
interface UiModalProps {
  /** Plain-text heading. For a heading with a badge use the `title` slot. */
  title?: string
  size?: UiModalSize
  /** `false` drops the × but keeps Esc and the backdrop working. */
  closable?: boolean
  /** `false` for forms where a stray click must not throw typed input away. */
  closeOnBackdrop?: boolean
  /** Accessible name when the modal has no visible heading. */
  ariaLabel?: string
}

const props = withDefaults(defineProps<UiModalProps>(), {
  title: '',
  size: 'sm',
  closable: true,
  closeOnBackdrop: true,
  ariaLabel: '',
})

const emit = defineEmits<{
  close: []
}>()

const slots = useSlots()

useEscapeClose(() => emit('close'))
useBodyScrollLock()

const titleId = `ui-modal-title-${useId()}`

const classes = computed(() => resolveUiModalClasses(props.size))
const hasHeader = computed(() => Boolean(props.title) || Boolean(slots.title))

function handleBackdrop(): void {
  if (props.closeOnBackdrop) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div :class="classes.overlay">
      <div :class="classes.backdrop" @click="handleBackdrop" />

      <div
        :class="classes.dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="hasHeader ? titleId : undefined"
        :aria-label="hasHeader ? undefined : ariaLabel || undefined"
      >
        <template v-if="hasHeader">
          <div :class="classes.header">
            <h2 :id="titleId" :class="classes.title">
              <slot name="title">{{ title }}</slot>
            </h2>

            <button
              v-if="closable"
              type="button"
              :class="classes.close"
              aria-label="Закрити"
              @click="emit('close')"
            >
              <CloseIcon :class="classes.closeIcon" />
            </button>
          </div>

          <UiDivider />
        </template>

        <div :class="classes.body">
          <slot />
        </div>

        <template v-if="slots.footer">
          <UiDivider />
          <div :class="classes.footer">
            <slot name="footer" />
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
