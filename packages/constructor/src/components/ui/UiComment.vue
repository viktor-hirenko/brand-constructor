<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import {
  UI_COMMENT_BODY_CLASS,
  UI_COMMENT_LABEL_CLASS,
  UI_COMMENT_VALUE_CLASS,
  resolveUiCommentClasses,
} from '@/components/ui/uiComment'

/**
 * Kit Comment — Figma `3439:1309`, Types Default / Unresolved / Resolved.
 * Recipe lives in `uiComment.ts`.
 *
 *   <UiComment label="Коментар замовника" :value="authorComment" />
 *
 *   <UiComment label="Коментар CEO" :value="value" :unresolved="!resolved">
 *     <template #footer><UiButton variant="secondary" size="S">…</UiButton></template>
 *   </UiComment>
 *
 * `label` is optional because one call site puts its caption outside the box
 * (the general CEO comment, whose label has to match the editor sitting next
 * to it — that shape is `UiFieldLabel`, phase 11). The kit's own label is the
 * inner one, and every other carrier uses it.
 *
 * The footer slot is the kit's Button row: the same Secondary S-32 in both
 * Unresolved and Resolved, which phase 10 established — the kit gives the
 * resolved state no surface of its own.
 */
interface UiCommentProps {
  label?: string
  value?: string
  /** Kit Type = Unresolved — the blue rail. */
  unresolved?: boolean
  resolved?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiCommentProps>(), {
  label: undefined,
  value: undefined,
  unresolved: false,
  resolved: false,
  class: undefined,
})

const commentClass = computed(() => resolveUiCommentClasses({ unresolved: props.unresolved, resolved: props.resolved }))
</script>

<template>
  <div :class="[commentClass, props.class]">
    <div :class="UI_COMMENT_BODY_CLASS">
      <p v-if="props.label" :class="UI_COMMENT_LABEL_CLASS">{{ props.label }}</p>
      <slot>
        <p :class="UI_COMMENT_VALUE_CLASS">{{ props.value }}</p>
      </slot>
    </div>
    <slot name="footer" />
  </div>
</template>
