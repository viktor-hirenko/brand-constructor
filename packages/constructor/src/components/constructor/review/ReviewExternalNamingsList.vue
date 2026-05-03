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
}

const props = withDefaults(defineProps<ReviewExternalNamingsListProps>(), {
  ceoItems: () => [],
})

const showDual = computed(() => props.ceoItems.length > 0)
</script>

<template>
  <div v-if="showDual" class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
      <ul v-if="items.length > 0" class="flex flex-col gap-1">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
        >
          <span class="text-[#5B5B62]">•</span>
          <span class="font-medium text-[#1A1A1A]">{{ item.name }}</span>
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
          <span class="font-medium text-[#1A1A1A]">{{ item.name }}</span>
          <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
        </li>
      </ul>
    </div>
  </div>
  <div v-else class="flex flex-col gap-2">
    <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Вибір замовника</p>
    <ul v-if="items.length > 0" class="flex flex-col gap-1">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
      >
        <span class="text-[#5B5B62]">•</span>
        <span class="font-medium text-[#1A1A1A]">{{ item.name }}</span>
        <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
      </li>
    </ul>
    <p v-else class="text-[14px] text-[#5B5B62] italic">Назву не обрано</p>
  </div>
</template>
