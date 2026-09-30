<script setup lang="ts">
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

</script>

<template>
  <UiComment
    class="ceo-comment-card"
    :class="resolved ? 'ceo-comment-card--resolved' : 'ceo-comment-card--unresolved'"
    label="Коментар CEO"
    :value="value"
    :unresolved="!resolved"
    :resolved="resolved"
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

      <!--
        «Вирішено» swaps to «Повернути» on hover. Both states are stacked in one
        grid cell, so the button keeps the width of the wider one: when the
        swap changed the width, a cursor on the edge fell off the button, the
        label swapped back, the cursor was on it again — the button shook
        (owner 30.09). The resting look is unchanged: the check sits where the
        kit's `Icon left` did (`-ml-1` gives back the label's own inset), 4
        before the text; the button is still 107 (`5387:105225`).
      -->
      <UiButton
        v-else
        variant="secondary"
        size="S"
        class="ceo-comment-card__resolve-button group self-start"
        :disabled="loading"
        @click="emit('unresolve')"
      >
        <span class="ceo-comment-card__resolved-label inline-grid">
          <span
            class="ceo-comment-card__resolved-state col-start-1 row-start-1 inline-flex items-center group-hover:invisible group-focus-visible:invisible"
          >
            <CheckIcon class="-ml-1 mr-1 size-4 shrink-0" aria-hidden="true" />
            Вирішено
          </span>
          <span
            class="ceo-comment-card__unresolve-state invisible col-start-1 row-start-1 justify-self-center group-hover:visible group-focus-visible:visible"
            aria-hidden="true"
          >
            Повернути
          </span>
        </span>
      </UiButton>
    </template>
  </UiComment>
</template>
