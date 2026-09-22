<script setup lang="ts">
import { computed, ref } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiComment from '@/components/ui/UiComment.vue'

/**
 * The kit's Comment in its Unresolved / Resolved types (`3443:4874` /
 * `3443:4879`) — the box itself is `ui/UiComment.vue` since DP-15258 phase 13.
 * What stays here is the behaviour: which of the two buttons is shown and the
 * hover that swaps «Вирішено» for «Повернути».
 *
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
 * is behaviour, not paint.
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
  <UiComment
    class="ceo-comment-card"
    :class="resolved ? 'ceo-comment-card--resolved' : 'ceo-comment-card--unresolved'"
    label="Коментар CEO"
    :value="value"
    :unresolved="!resolved"
  >
    <template v-if="canResolve" #footer>
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
  </UiComment>
</template>
