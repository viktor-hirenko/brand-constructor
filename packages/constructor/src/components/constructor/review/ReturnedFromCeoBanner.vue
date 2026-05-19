<script setup lang="ts">
import { computed } from 'vue'

interface ReturnedFromCeoBannerProps {
  /** Number of sections that still require attention (unresolved comment OR undecided CEO alternative). */
  attentionCount: number
}

const props = defineProps<ReturnedFromCeoBannerProps>()

const sectionWord = computed(() => {
  const n = props.attentionCount
  if (n % 10 === 1 && n % 100 !== 11) return 'секція'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'секції'
  return 'секцій'
})
</script>

<template>
  <div class="rounded-2xl bg-[#f3f3f5] px-6 py-6">
    <div class="flex items-start gap-3 mb-2">
      <svg
        class="size-6 shrink-0 text-[#C97D00] mt-0.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <h3 class="text-lg font-medium tracking-[-0.45px] text-foreground">
        {{ attentionCount }} {{ sectionWord }} потребують уваги
      </h3>
    </div>
    <p class="text-sm text-muted-foreground leading-5 pl-9">
      Перегляньте коментарі та зміни від СЕО і оновіть бриф перед повторною відправкою.
    </p>
  </div>
</template>
