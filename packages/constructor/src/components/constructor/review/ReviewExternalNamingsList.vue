<script setup lang="ts">
interface ExternalNamingItem {
  id: string
  name: string
  domain?: string
}

interface ReviewExternalNamingsListProps {
  items: ExternalNamingItem[]
}

defineProps<ReviewExternalNamingsListProps>()
</script>

<template>
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
</template>
