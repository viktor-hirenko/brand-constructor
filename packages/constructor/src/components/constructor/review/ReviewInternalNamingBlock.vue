<script setup lang="ts">
import { computed } from 'vue'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'

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
    <ul class="flex flex-col gap-1">
      <li class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
        <span class="text-[#5B5B62]">•</span>
        <span class="text-[#1A1A1A]">{{ poValue }}</span>
      </li>
    </ul>
  </div>

  <!-- Dual view: PO + CEO + apply button -->
  <div v-else-if="showDual" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
      <ul class="flex flex-col gap-1">
        <li class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
          <span class="text-[#5B5B62]">•</span>
          <span class="text-[#1A1A1A]">{{ poValue }}</span>
        </li>
      </ul>
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір CEO</p>
      <ul class="flex flex-col gap-1">
        <li class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
          <span class="text-[#5B5B62]">•</span>
          <span class="text-[#1A1A1A]">{{ ceoName }}</span>
        </li>
      </ul>
    </div>
    <ApplyCeoVariantButton
      v-if="showApplyCeo"
      :loading="applyLoading"
      @click="emit('applyCeo')"
    />
  </div>

  <!-- Single view: PO only -->
  <div v-else class="flex flex-col gap-1">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
    <ul class="flex flex-col gap-1">
      <li class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
        <span class="text-[#5B5B62]">•</span>
        <span class="text-[#1A1A1A]">{{ poValue }}</span>
      </li>
    </ul>
  </div>
</template>
