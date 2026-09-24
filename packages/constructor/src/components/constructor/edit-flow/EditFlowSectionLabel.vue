<script setup lang="ts">
interface EditFlowSectionLabelProps {
  /** Root HTML tag for the label line. */
  tag?: 'p' | 'h2' | 'h3'
}

withDefaults(defineProps<EditFlowSectionLabelProps>(), {
  tag: 'p',
})
</script>

<template>
  <component
    :is="tag"
    class="edit-flow-section-label text-[1rem] font-medium leading-6 text-ink-900"
  >
    <slot />
  </component>
</template>
