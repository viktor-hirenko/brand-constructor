<script setup lang="ts">
interface Option {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: Option[]
  modelValue: string
}

defineProps<SegmentedControlProps>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div
    class="inline-flex self-start rounded-full bg-[#ececf0] p-1 gap-1 border border-black/5"
    role="group"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="h-10 px-4 rounded-full text-base font-medium tracking-[-0.31px] transition-all"
      :class="
        modelValue === option.value
          ? 'bg-white text-foreground shadow-[0px_8px_10px_0px_rgba(0,0,0,0.1)]'
          : 'text-[#6e6e6e] hover:text-foreground'
      "
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
