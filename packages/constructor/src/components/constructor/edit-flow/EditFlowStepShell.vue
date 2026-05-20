<script setup lang="ts">
/**
 * Shared chrome for CEO re-select and PO edit step screens — outer flex column,
 * scrollable body, identical header (title + subtitle). Body goes into the
 * default slot, footer into the `#footer` slot.
 */
interface EditFlowStepShellProps {
  title: string
  subtitle?: string
}

withDefaults(defineProps<EditFlowStepShellProps>(), {
  subtitle: '',
})
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pr-2 pb-4">
      <div>
        <h1
          class="text-2xl font-medium text-[#0a0a0a] tracking-[0.0703px] mb-2 leading-8"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]"
        >
          {{ subtitle }}
        </p>
      </div>
      <slot />
    </div>
    <slot name="footer" />
  </div>
</template>
