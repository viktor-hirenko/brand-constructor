<script setup lang="ts">
import { computed, ref } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import {
  CEO_COMMENT_CARD_BG,
  CEO_COMMENT_LABEL_COLOR,
  CEO_COMMENT_RESOLVE_BUTTON_BASE_CLASS,
  CEO_COMMENT_RESOLVE_BUTTON_HOVER_CLASS,
  CEO_COMMENT_RESOLVE_BUTTON_LABEL_CLASS,
  CEO_COMMENT_RESOLVE_BUTTON_WHITE_CLASS,
  CEO_COMMENT_UNRESOLVED_ACCENT,
  CEO_COMMENT_VALUE_COLOR,
} from '@/constants/ceoCommentCardVisual'

interface SupervisorCommentCardProps {
  value: string
  resolved: boolean
  loading?: boolean
  canResolve?: boolean
}

const props = withDefaults(defineProps<SupervisorCommentCardProps>(), {
  loading: false,
  canResolve: false,
})

const emit = defineEmits<{
  resolve: []
  unresolve: []
}>()

const resolvedButtonHovered = ref(false)

const resolveButtonSurfaceClass = computed(() =>
  props.resolved && resolvedButtonHovered.value
    ? CEO_COMMENT_RESOLVE_BUTTON_HOVER_CLASS
    : CEO_COMMENT_RESOLVE_BUTTON_WHITE_CLASS,
)

const showResolveIcon = computed(
  () => !props.resolved || !resolvedButtonHovered.value,
)
</script>

<template>
  <div
    class="ceo-comment-card flex flex-col gap-3 overflow-hidden rounded-[8px] p-4 transition-all"
    :class="[
      !resolved
        ? 'ceo-comment-card--unresolved border-l-2 pl-4'
        : 'ceo-comment-card--resolved',
    ]"
    :style="{
      backgroundColor: CEO_COMMENT_CARD_BG,
      borderLeftColor: !resolved ? CEO_COMMENT_UNRESOLVED_ACCENT : undefined,
    }"
  >
    <div class="ceo-comment-card__body flex flex-col gap-1">
      <p
        class="ceo-comment-card__label text-[14px] font-medium leading-4 tracking-[-0.1504px]"
        :style="{ color: CEO_COMMENT_LABEL_COLOR }"
      >
        Коментар CEO
      </p>
      <p
        class="ceo-comment-card__value whitespace-pre-line text-[16px] font-normal leading-6 tracking-[-0.1504px]"
        :style="{ color: CEO_COMMENT_VALUE_COLOR }"
      >
        {{ value }}
      </p>
    </div>

    <template v-if="canResolve">
      <button
        v-if="!resolved"
        type="button"
        :class="[
          'ceo-comment-card__resolve-button',
          CEO_COMMENT_RESOLVE_BUTTON_BASE_CLASS,
          CEO_COMMENT_RESOLVE_BUTTON_WHITE_CLASS,
        ]"
        :disabled="loading"
        @click="emit('resolve')"
      >
        <CheckIcon class="size-4 shrink-0 text-[#373737]" aria-hidden="true" />
        <span :class="CEO_COMMENT_RESOLVE_BUTTON_LABEL_CLASS">Позначити як вирішений</span>
      </button>

      <button
        v-else
        type="button"
        :class="[
          'ceo-comment-card__resolve-button',
          CEO_COMMENT_RESOLVE_BUTTON_BASE_CLASS,
          resolveButtonSurfaceClass,
        ]"
        :disabled="loading"
        @click="emit('unresolve')"
        @mouseenter="resolvedButtonHovered = true"
        @mouseleave="resolvedButtonHovered = false"
      >
        <CheckIcon
          v-if="showResolveIcon"
          class="size-4 shrink-0 text-[#373737]"
          aria-hidden="true"
        />
        <span :class="CEO_COMMENT_RESOLVE_BUTTON_LABEL_CLASS">
          {{ resolvedButtonHovered ? 'Повернути' : 'Вирішено' }}
        </span>
      </button>
    </template>
  </div>
</template>
