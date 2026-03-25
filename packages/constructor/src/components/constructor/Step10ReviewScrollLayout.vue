<script setup lang="ts">
interface Step10ReviewScrollLayoutProps {
  ceoUnifiedScroll: boolean
}

defineProps<Step10ReviewScrollLayoutProps>()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <template v-if="ceoUnifiedScroll">
      <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2">
        <div class="space-y-3">
          <slot name="summary" />
        </div>
        <div class="flex flex-col gap-6">
          <slot name="footer" />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-2">
          <slot name="summary" />
        </div>
        <div class="flex shrink-0 flex-col gap-6">
          <slot name="footer" />
        </div>
      </div>
    </template>
  </div>
</template>
