<script setup lang="ts">
import { computed } from 'vue'

interface ExternalNamingItem {
  id: string
  name: string
  domain?: string
}

interface ReviewExternalNamingsListProps {
  items: ExternalNamingItem[]
  /** CEO picks — when non-empty, shows a second labelled list. */
  ceoItems?: ExternalNamingItem[]
  /** Show "Застосувати варіант CEO" button below the dual list. */
  showApplyCeo?: boolean
  /** Disable the apply button while request is in-flight. */
  applyLoading?: boolean
  /** Applied state: show single list with "Обрані назви" label. */
  ceoApplied?: boolean
}

const props = withDefaults(defineProps<ReviewExternalNamingsListProps>(), {
  ceoItems: () => [],
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
})

const emit = defineEmits<{ applyCeo: [] }>()

const showDual = computed(() => props.ceoItems.length > 0 && !props.ceoApplied)
</script>

<template>
  <!-- Applied: single list with "Обрані назви" label (Figma 1981:1749) -->
  <div v-if="ceoApplied" class="flex flex-col gap-2">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Обрані назви</p>
    <ul v-if="items.length > 0" class="flex flex-col gap-1">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
      >
        <span class="text-[#5B5B62]">•</span>
        <span class="text-[#1A1A1A]">{{ item.name }}</span>
        <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
      </li>
    </ul>
    <p v-else class="text-[14px] text-[#5B5B62] italic">Назву не обрано</p>
  </div>

  <!-- Dual view: PO + CEO lists + apply button (Figma 1973:8015) -->
  <div v-else-if="showDual" class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
      <ul v-if="items.length > 0" class="flex flex-col gap-1">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
        >
          <span class="text-[#5B5B62]">•</span>
          <span class="text-[#1A1A1A]">{{ item.name }}</span>
          <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
        </li>
      </ul>
      <p v-else class="text-[14px] text-[#5B5B62] italic">Назву не обрано</p>
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір CEO</p>
      <ul class="flex flex-col gap-1">
        <li
          v-for="item in ceoItems"
          :key="item.id"
          class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
        >
          <span class="text-[#5B5B62]">•</span>
          <span class="text-[#1A1A1A]">{{ item.name }}</span>
          <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
        </li>
      </ul>
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

  <!-- Single list: PO only -->
  <div v-else class="flex flex-col gap-2">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
    <ul v-if="items.length > 0" class="flex flex-col gap-1">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
      >
        <span class="text-[#5B5B62]">•</span>
        <span class="text-[#1A1A1A]">{{ item.name }}</span>
        <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
      </li>
    </ul>
    <p v-else class="text-[14px] text-[#5B5B62] italic">Назву не обрано</p>
  </div>
</template>
