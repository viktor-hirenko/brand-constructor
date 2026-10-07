<script setup lang="ts">
import pencilSimple from '@phosphor-icons/core/regular/pencil-simple.svg?raw'
import trash from '@phosphor-icons/core/regular/trash.svg?raw'
import clockCounterClockwise from '@phosphor-icons/core/regular/clock-counter-clockwise.svg?raw'
import BaseButton from '@/components/ui/BaseButton.vue'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'

/**
 * An action of a table row: one look in every table of the admin — a small
 * button with a Phosphor glyph, the word as its tooltip and label. Tables had
 * «Редагувати» / «Видалити» in words in one place, glyph buttons in another
 * and a bare glyph in a third (owner, 07.10). On a card, where there is room,
 * the same actions stay as words: use BaseButton there.
 */
type Kind = 'edit' | 'delete' | 'history'

const GLYPHS: Record<Kind, string> = {
  edit: pencilSimple,
  delete: trash,
  history: clockCounterClockwise,
}

defineProps<{
  kind: Kind
  /** The tooltip and the screen-reader label: «Редагувати», «Видалити»… */
  label: string
}>()
</script>

<template>
  <BaseButton
    :variant="kind === 'delete' ? 'danger' : 'secondary'"
    size="sm"
    class="row-action"
    :title="label"
    :aria-label="label"
  >
    <PhosphorIcon :svg="GLYPHS[kind]" class="row-action__icon" />
  </BaseButton>
</template>

<style lang="scss" scoped>
.row-action {
  padding: $spacing-1 $spacing-2;

  & + & {
    margin-left: $spacing-2;
  }

  :deep(.btn__content) {
    display: inline-flex;
    align-items: center;
  }
}

.row-action__icon {
  width: 16px;
  height: 16px;
}
</style>
