<script setup lang="ts">
const model = defineModel<boolean | null>({ required: true })
</script>

<template>
  <div class="flex gap-4">
    <button
      type="button"
      class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
      :class="
        model === true
          ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
          : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
      "
      @click="model = true"
    >
      Так
    </button>
    <button
      type="button"
      class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
      :class="
        model === false
          ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
          : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
      "
      @click="model = false"
    >
      Ні
    </button>
  </div>
</template>
