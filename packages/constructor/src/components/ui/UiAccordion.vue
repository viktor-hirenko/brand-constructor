<script setup lang="ts">
import { computed } from 'vue'
import { resolveUiAccordionListClasses } from '@/components/ui/uiAccordion'

/**
 * The list that holds `UiAccordionItem` sections. Recipe in `uiAccordion.ts`.
 *
 * It exists for two reasons and neither is the gap: it is the carrier of the
 * kit's Disabled state for the whole group (`opacity/50`, inert), and it is the
 * class the loading skeleton mirrors so the two lists sit on the same pitch.
 */
interface UiAccordionProps {
  /** Kit State = Disabled on every section at once — the delegate branch. */
  disabled?: boolean
}

const props = withDefaults(defineProps<UiAccordionProps>(), { disabled: false })

const rootClass = computed(() => resolveUiAccordionListClasses({ disabled: props.disabled }))
</script>

<template>
  <div :class="rootClass">
    <slot />
  </div>
</template>
