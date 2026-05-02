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
  <div class="flex items-start gap-7">
    <div class="size-5 shrink-0 mt-1 text-muted-foreground">
      <svg
        class="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </div>
    <div class="flex-1 min-w-0 space-y-2">
      <p class="text-xs text-muted-foreground leading-4">Зовнішнє позиціонування</p>
      <ul v-if="items.length > 0" class="space-y-1.5">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex items-baseline gap-2 text-base text-foreground tracking-[-0.31px]"
        >
          <span class="text-muted-foreground">•</span>
          <span class="font-medium">{{ item.name }}</span>
          <span v-if="item.domain" class="text-sm text-muted-foreground">{{ item.domain }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground italic">Назву не обрано</p>
    </div>
  </div>
</template>
