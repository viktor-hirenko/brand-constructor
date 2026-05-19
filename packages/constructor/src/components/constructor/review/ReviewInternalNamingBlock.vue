<script setup lang="ts">
import { computed } from 'vue'

interface ReviewInternalNamingBlockProps {
  poValue: string
  ceoName?: string | null
  /** Show "Застосувати варіант CEO" button. */
  showApplyCeo?: boolean
  applyLoading?: boolean
  /** Applied state: show single value with "Обрана назва" label. */
  ceoApplied?: boolean
}

const props = withDefaults(defineProps<ReviewInternalNamingBlockProps>(), {
  ceoName: null,
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
})

const emit = defineEmits<{ applyCeo: [] }>()

const showDual = computed(
  () => !!props.ceoName && String(props.ceoName).trim().length > 0 && !props.ceoApplied
)
</script>

<template>
  <!-- Applied state: "Обрана назва" -->
  <div v-if="ceoApplied" class="flex flex-col gap-1">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Обрана назва</p>
    <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">{{ poValue }}</p>
  </div>

  <!-- Dual view: PO + CEO + apply button -->
  <div v-else-if="showDual" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">{{ poValue }}</p>
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір CEO</p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">{{ ceoName }}</p>
    </div>
    <button
      v-if="showApplyCeo"
      type="button"
      class="w-full h-12 rounded-xl border border-black/10 text-[14px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="applyLoading"
      @click="emit('applyCeo')"
    >
      {{ applyLoading ? 'Застосовується…' : 'Застосувати варіант CEO' }}
    </button>
  </div>

  <!-- Single view: PO only -->
  <div v-else class="flex flex-col gap-1">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
    <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">{{ poValue }}</p>
  </div>
</template>
