<script setup lang="ts">
import type { InternalNaming } from '@brand-constructor/shared/types'
import UiNameCard from '@/components/ui/UiNameCard.vue'
import { UI_NAME_CARD_GRID_CLASS } from '@/components/ui/uiNameCard'

/**
 * Step 4 (internal naming) — the designer redrew this screen: the square tiles
 * became rows of the kit's `Name card` in two columns
 * (`4071:7486`, and the same layout again on the new canvas `5387:104658`).
 *
 * Only the look changes. Single selection still lives in the store and the
 * props and events of this component are byte-identical to the tile version,
 * so all four call sites — step 4, the alternative flow, the revision flow and
 * the story — keep working untouched.
 */
interface InternalNamingGridProps {
  namings: InternalNaming[]
  selectedId: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<InternalNamingGridProps>(), {
  disabled: false,
})

const emit = defineEmits<{
  select: [namingId: string]
}>()

function handleSelect(naming: InternalNaming) {
  if (props.disabled) return
  emit('select', naming.id)
}
</script>

<template>
  <!-- Two fixed columns, gap 8 — measured on the drawn screen; see `uiNameCard.ts`
       for why this grid does not use the auto-fill formula of the tile grids.
       The `internal-naming-grid` hook is kept: BEM names in this package are
       external hooks (риски раздел документа задачи), so renaming one is not
       free even though no CSS in this repo defines it. -->
  <div v-if="namings.length > 0" :class="['internal-naming-grid', UI_NAME_CARD_GRID_CLASS]">
    <UiNameCard
      v-for="naming in namings"
      :key="naming.id"
      :name="naming.name"
      :selected="selectedId === naming.id"
      :disabled="disabled"
      @select="handleSelect(naming)"
    />
  </div>
  <div v-else class="internal-naming-grid__empty text-center py-8 text-muted-foreground text-sm">
    Внутрішні неймінги не знайдено
  </div>
</template>
