<script setup lang="ts">
import type { InternalNaming } from '@brand-constructor/shared/types'

interface InternalNamingGridProps {
  namings: InternalNaming[]
  selectedId: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<InternalNamingGridProps>(), {
  disabled: false,
})

const emit = defineEmits<{
  select: [namingId: string]
}>()

function handleClick(naming: InternalNaming) {
  if (props.disabled) return
  emit('select', naming.id)
}
</script>

<template>
  <div
    v-if="namings.length > 0"
    class="grid grid-cols-3 gap-2 max-w-[506px]"
  >
    <div
      v-for="naming in namings"
      :key="naming.id"
      class="relative h-[128px] rounded-[16px] bg-white flex flex-col items-center justify-center px-6 py-10 transition-all"
      :class="[
        selectedId === naming.id
          ? 'border-2 border-[#030213] cursor-pointer'
          : disabled
            ? 'border border-black/10 opacity-40 cursor-not-allowed'
            : 'border border-black/10 hover:border-primary/50 cursor-pointer',
      ]"
      @click="handleClick(naming)"
    >
      <p
        class="text-[20px] font-medium leading-6 text-center text-[#1a1a1a] tracking-[-0.1504px] break-words w-full"
      >
        {{ naming.name }}
      </p>

      <div
        v-if="selectedId === naming.id"
        class="absolute top-[6px] left-[6px] size-8 rounded-[100px] bg-[#030213] flex items-center justify-center"
      >
        <svg
          class="size-4 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    </div>
  </div>
  <div v-else class="text-center py-8 text-muted-foreground text-sm">
    Внутрішні неймінги не знайдено
  </div>
</template>
