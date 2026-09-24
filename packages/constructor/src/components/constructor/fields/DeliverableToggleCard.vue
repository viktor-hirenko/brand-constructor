<script setup lang="ts">
import UiToggle from '@/components/ui/UiToggle.vue'

interface DeliverableToggleCardProps {
  title: string
  description: string
}

defineProps<DeliverableToggleCardProps>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="p-6 bg-[#f3f3f5] border border-black/10 rounded-[14px]">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-4 flex-1">
        <div
          class="size-12 rounded-[10px] bg-[rgba(3,2,19,0.1)] flex items-center justify-center shrink-0"
        >
          <slot name="icon" />
        </div>
        <div>
          <h3 class="text-lg font-medium text-foreground mb-1">
            {{ title }}
          </h3>
          <p class="text-sm text-muted-foreground">{{ description }}</p>
        </div>
      </div>
      <!--
        Kit toggle `3764:6920`. Before DP-15258 phase 14 this was a CSS peer
        recipe over a visually hidden checkbox: 56×28 with a ⌀24 thumb, inset 4,
        travel 28, and an off colour the kit does not contain. See
        `ui/uiToggle.ts` for the measured kit numbers.
      -->
      <UiToggle v-model="model" :aria-label="title" class="cursor-pointer" />
    </div>
  </div>
</template>
