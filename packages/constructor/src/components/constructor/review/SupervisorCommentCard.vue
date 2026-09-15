<script setup lang="ts">
import { computed, ref } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  CEO_COMMENT_CARD_BG,
  CEO_COMMENT_LABEL_COLOR,
  CEO_COMMENT_UNRESOLVED_ACCENT,
  CEO_COMMENT_VALUE_COLOR,
} from '@/constants/ceoCommentCardVisual'

/**
 * The resolve action is the kit Button, Secondary, S-32 — and so is its
 * resolved twin. Both symbols inside the kit's Comment (`3443:4915` in
 * Type=Unresolved, `3443:4916` in Type=Resolved) return the same three slots
 * from `get_variable_defs`: `button/secondary/bg/default` #ffffff,
 * `button/secondary/border` #eaeaeb, `button/secondary/content/default`
 * #393947, at `caption/l/medium` 14/16 with 8 padding and a 4 gap.
 *
 * So the kit gives the resolved state no surface of its own. What used to be a
 * hand-rolled #ededed hover on that state is now the Secondary hover the whole
 * product shares; the hover still swaps the label to «Повернути», because that
 * is behaviour, not paint. The card around the button — background, the blue
 * unresolved rail, the two text colours — is untouched here: that is the kit's
 * Comment component and it belongs to phase 13.
 */

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
        class="ceo-comment-card__label text-[0.875rem] font-medium leading-4 tracking-[-0.1504px]"
        :style="{ color: CEO_COMMENT_LABEL_COLOR }"
      >
        Коментар CEO
      </p>
      <p
        class="ceo-comment-card__value whitespace-pre-line text-[1rem] font-normal leading-6 tracking-[-0.1504px]"
        :style="{ color: CEO_COMMENT_VALUE_COLOR }"
      >
        {{ value }}
      </p>
    </div>

    <template v-if="canResolve">
      <UiButton
        v-if="!resolved"
        variant="secondary"
        size="S"
        class="ceo-comment-card__resolve-button self-start"
        :disabled="loading"
        @click="emit('resolve')"
      >
        <template #icon-left="{ iconClass }">
          <CheckIcon :class="iconClass" aria-hidden="true" />
        </template>
        Позначити як вирішений
      </UiButton>

      <UiButton
        v-else
        variant="secondary"
        size="S"
        class="ceo-comment-card__resolve-button self-start"
        :disabled="loading"
        @click="emit('unresolve')"
        @mouseenter="resolvedButtonHovered = true"
        @mouseleave="resolvedButtonHovered = false"
      >
        <!-- The slot is always declared and the glyph inside it is what
             disappears on hover: `UiButton` reads its slots once per render,
             so removing the slot itself would leave the check behind. -->
        <template #icon-left="{ iconClass }">
          <CheckIcon v-if="showResolveIcon" :class="iconClass" aria-hidden="true" />
        </template>
        {{ resolvedButtonHovered ? 'Повернути' : 'Вирішено' }}
      </UiButton>
    </template>
  </div>
</template>
