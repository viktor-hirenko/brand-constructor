<script setup lang="ts">
import { ref } from 'vue'

interface CeoCommentCardProps {
  /** Raw text of the CEO comment. */
  value: string
  /** Whether PO has marked this comment as resolved. */
  resolved: boolean
  /** Disables buttons while the resolve/unresolve API call is in-flight. */
  loading?: boolean
  /** Whether the current user is allowed to resolve/unresolve (brand owner only). */
  canResolve?: boolean
}

withDefaults(defineProps<CeoCommentCardProps>(), {
  loading: false,
  canResolve: false,
})

const emit = defineEmits<{
  resolve: []
  unresolve: []
}>()

/** Controls hover state to swap "Вирішено" → "Повернути". */
const resolvedButtonHovered = ref(false)
</script>

<template>
  <div
    :class="[
      'rounded-lg bg-[rgba(197,197,200,0.2)] p-4 flex flex-col gap-3 transition-all',
      !resolved ? 'border-l-[3px] border-blue-500 pl-[13px]' : '',
    ]"
  >
    <div class="flex flex-col gap-1">
      <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
        Коментар CEO
      </p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line">
        {{ value }}
      </p>
    </div>

    <template v-if="canResolve">
      <!-- Unresolved: show "Позначити як вирішений" -->
      <button
        v-if="!resolved"
        type="button"
        class="inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-full border border-black/15 bg-white text-[13px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="emit('resolve')"
      >
        <svg
          class="size-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>Позначити як вирішений</span>
      </button>

      <!-- Resolved: show "Вирішено" → hover → "Повернути" -->
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-full border border-black/15 bg-white text-[13px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="emit('unresolve')"
        @mouseenter="resolvedButtonHovered = true"
        @mouseleave="resolvedButtonHovered = false"
      >
        <svg
          class="size-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>{{ resolvedButtonHovered ? 'Повернути' : 'Вирішено' }}</span>
      </button>
    </template>
  </div>
</template>
