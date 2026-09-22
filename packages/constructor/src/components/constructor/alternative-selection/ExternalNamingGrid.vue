<script setup lang="ts">
import { computed } from 'vue'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import UiNameCard from '@/components/ui/UiNameCard.vue'
import { UI_NAME_CARD_LIST_CLASS } from '@/components/ui/uiNameCard'

/**
 * Step 3 (external naming) — the designer redrew this screen: the square tiles
 * became a single column of the kit's `Name card`, 76 tall, with the domain
 * under the name and the price and the Available/Sold badge on the right
 * (`4071:7082`, and the same layout again on the new canvas `5382:37529` and in
 * the edit flow on `5395:107506`).
 *
 * Only the look changes. The multi-select rules — the cap of three, sold
 * namings staying selectable, available namings sorting above sold — live here
 * and in the store exactly as they did, and the props and events of this
 * component are byte-identical to the tile version, so all four call sites
 * (step 3, the CEO alternative flow, the draft edit flow, the revision flow)
 * keep working untouched.
 */
interface ExternalNamingGridProps {
  namings: ExternalNaming[]
  /** Multi-select staged ids. */
  selectedIds: string[]
  /** IDs to hide from the grid (e.g. customer's already-picked options). */
  excludeIds?: string[]
  /** Hard cap; clicking another card while at limit is a no-op. */
  maxSelectable?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<ExternalNamingGridProps>(), {
  disabled: false,
  maxSelectable: 3,
  excludeIds: () => [],
})

const emit = defineEmits<{
  toggle: [namingId: string]
}>()

const selectedSet = computed(() => new Set(props.selectedIds))
const isAtLimit = computed(() => props.selectedIds.length >= props.maxSelectable)
const visibleNamings = computed(() => {
  const excluded = new Set(props.excludeIds)
  const filtered =
    props.excludeIds.length === 0
      ? [...props.namings]
      : props.namings.filter(n => !excluded.has(n.id))
  // Available cards always come first; sold/unknown stay below.
  return filtered.sort((a, b) => {
    const rank = (n: ExternalNaming) => (n.availability_status === 'available' ? 0 : 1)
    return rank(a) - rank(b)
  })
})

function isSelected(naming: ExternalNaming): boolean {
  return selectedSet.value.has(naming.id)
}

function isDisabledForSelection(naming: ExternalNaming): boolean {
  if (props.disabled) return true
  // Sold namings are selectable; only block unselected cards when at the limit.
  if (!isSelected(naming) && isAtLimit.value) return true
  return false
}

function handleSelect(naming: ExternalNaming) {
  if (isDisabledForSelection(naming)) return
  emit('toggle', naming.id)
}
</script>

<template>
  <!-- One column at the container's full width, gap 8 — measured on the drawn
       screen; see `uiNameCard.ts`. The `external-naming-grid` hook is kept: BEM
       names in this package are external hooks (риски раздел документа задачи),
       so renaming one is not free even though no CSS in this repo defines it. -->
  <div
    v-if="visibleNamings.length > 0"
    :class="['external-naming-grid', UI_NAME_CARD_LIST_CLASS]"
  >
    <UiNameCard
      v-for="naming in visibleNamings"
      :key="naming.id"
      detailed
      reserve-badge
      :name="naming.name"
      :domain="naming.domain"
      :price="naming.price"
      :availability="naming.availability_status"
      :selected="isSelected(naming)"
      :disabled="isDisabledForSelection(naming)"
      @select="handleSelect(naming)"
    />
  </div>
  <div v-else class="external-naming-grid__empty text-center py-8 text-muted-foreground text-sm">
    Неймінги не знайдено
  </div>
</template>
