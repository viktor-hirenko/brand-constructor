<script setup lang="ts">
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
          <h3 class="text-lg font-medium text-foreground tracking-[-0.44px] mb-1">
            {{ title }}
          </h3>
          <p class="text-sm text-muted-foreground tracking-[-0.15px]">{{ description }}</p>
        </div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer shrink-0">
        <input v-model="model" type="checkbox" class="sr-only peer" />
        <div
          class="w-14 h-7 bg-[#ececf0] rounded-full peer peer-checked:bg-[#030213] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-7"
        />
      </label>
    </div>
  </div>
</template>
