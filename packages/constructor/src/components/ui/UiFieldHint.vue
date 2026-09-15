<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { resolveUiFieldHintClasses } from '@/components/ui/uiField'

/**
 * Kit Description — Figma `3424:5408`, the caption BELOW an input. Two types:
 * Default (`input/description` #6f6f7d) and Error (`input/error` #ce2c31),
 * both `caption/l/regular` 14/16.
 *
 * This is the single shape behind three spellings that lived in the tree:
 * the required hint under a comment field (`text-sm text-muted-foreground`),
 * the step-1 validation messages (`text-red-500 text-sm`) and the modal save
 * errors. They differed in size, colour and line-height.
 */
interface UiFieldHintProps {
  tone?: 'default' | 'error'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiFieldHintProps>(), {
  tone: 'default',
  class: undefined,
})

const hintClass = computed(() => resolveUiFieldHintClasses(props.tone))
</script>

<template>
  <p :class="[hintClass, props.class]"><slot /></p>
</template>
