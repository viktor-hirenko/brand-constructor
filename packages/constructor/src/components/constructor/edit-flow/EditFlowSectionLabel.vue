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
    class="edit-flow-section-label text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]"
  >
    <slot />
  </component>
</template>
