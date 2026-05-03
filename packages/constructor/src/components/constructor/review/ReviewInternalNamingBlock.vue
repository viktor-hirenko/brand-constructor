<script setup lang="ts">
import { computed } from 'vue'

interface ReviewInternalNamingBlockProps {
  poValue: string
  ceoName?: string | null
}

const props = withDefaults(defineProps<ReviewInternalNamingBlockProps>(), {
  ceoName: null,
})

const showDual = computed(
  () => !!props.ceoName && String(props.ceoName).trim().length > 0
)
</script>

<template>
  <div v-if="showDual" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
        {{ poValue }}
      </p>
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір CEO</p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
        {{ ceoName }}
      </p>
    </div>
  </div>
  <div v-else class="flex flex-col gap-1">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
    <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
      {{ poValue }}
    </p>
  </div>
</template>
