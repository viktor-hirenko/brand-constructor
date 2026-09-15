<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { resolveUiLinkClasses } from '@/components/ui/uiLink'

/**
 * Kit link — Figma `4378:8358`. The recipe lives in `uiLink.ts`.
 *
 * The kit symbol is `[Icon 16] gap 4 [Label 14/16]`, so the leading glyph gets
 * its own slot and is handed the resolved icon class:
 *
 *   <UiLink @click="…">
 *     <template #icon="{ iconClass }"><EyeIcon :class="iconClass" /></template>
 *     Переглянути
 *   </UiLink>
 *
 * Renders a `<button>`, not an `<a>`. Every link this replaces opens a modal or
 * a preview inside the wizard — none of them navigates — and an `href` mode
 * with no call site is exactly the atom-without-a-consumer that this task has
 * four dead examples of (see "Причина" in the task document). The one real
 * anchor in the wizard, the Jira link on `BrandSuccessView`, keeps its
 * underline on purpose: it leaves the product, and the underline is the only
 * affordance saying so. `BrandSuccessView` belongs to phase 10.
 *
 * The kit's Icon-right slot exists but ships hidden in both states and has no
 * call site here, so it is not built.
 */
interface UiLinkProps {
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiLinkProps>(), {
  disabled: false,
  type: 'button',
  class: undefined,
})

const classes = resolveUiLinkClasses()
</script>

<template>
  <button :type="props.type" :disabled="props.disabled" :class="[classes.root, props.class]">
    <slot name="icon" :icon-class="classes.icon" />
    <slot />
  </button>
</template>
