<script setup lang="ts">
import { ref } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'

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
      'ceo-comment-card rounded-lg bg-[rgba(197,197,200,0.2)] p-4 flex flex-col gap-3 transition-all',
      !resolved ? 'border-l-[3px] border-blue-500 pl-[13px] ceo-comment-card--unresolved' : 'ceo-comment-card--resolved',
    ]"
  >
    <div class="ceo-comment-card__body flex flex-col gap-1">
      <p class="ceo-comment-card__label text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
        Коментар CEO
      </p>
      <p class="ceo-comment-card__value text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line">
        {{ value }}
      </p>
    </div>

    <template v-if="canResolve">
      <!-- Unresolved: show "Позначити як вирішений" -->
      <button
        v-if="!resolved"
        type="button"
        class="ceo-comment-card__resolve-button inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-full border border-black/15 bg-white text-[13px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="emit('resolve')"
      >
        <CheckIcon class="size-3.5 shrink-0" />
        <span>Позначити як вирішений</span>
      </button>

      <!-- Resolved: show "Вирішено" → hover → "Повернути" -->
      <button
        v-else
        type="button"
        class="ceo-comment-card__resolve-button inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-full border border-black/15 bg-white text-[13px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="emit('unresolve')"
        @mouseenter="resolvedButtonHovered = true"
        @mouseleave="resolvedButtonHovered = false"
      >
        <CheckIcon
          v-if="!resolvedButtonHovered"
          class="size-3.5 shrink-0"
        />
        <span>{{ resolvedButtonHovered ? 'Повернути' : 'Вирішено' }}</span>
      </button>
    </template>
  </div>
</template>
