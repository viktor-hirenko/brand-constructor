<script setup lang="ts">
import { computed } from 'vue'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import CheckIcon from '@/components/icons/CheckIcon.vue'

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
    props.excludeIds.length === 0 ? [...props.namings] : props.namings.filter(n => !excluded.has(n.id))
  // Available cards always come first; sold/unknown stay below.
  return filtered.sort((a, b) => {
    const rank = (n: ExternalNaming) => (n.availability_status === 'available' ? 0 : 1)
    return rank(a) - rank(b)
  })
})

function isSold(naming: ExternalNaming): boolean {
  return naming.availability_status === 'sold'
}

function isSelected(naming: ExternalNaming): boolean {
  return selectedSet.value.has(naming.id)
}

function isDisabledForSelection(naming: ExternalNaming): boolean {
  if (props.disabled || isSold(naming)) return true
  if (!isSelected(naming) && isAtLimit.value) return true
  return false
}

function handleClick(naming: ExternalNaming) {
  if (isDisabledForSelection(naming)) return
  emit('toggle', naming.id)
}

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return ''
  return `$${price.toLocaleString('uk-UA').replace(/,/g, ' ')}`
}
</script>

<template>
  <div
    v-if="visibleNamings.length > 0"
    class="external-naming-grid grid grid-cols-3 gap-2 max-w-[506px]"
  >
    <div
      v-for="naming in visibleNamings"
      :key="naming.id"
      class="external-naming-grid__card relative box-border rounded-[16px] bg-white flex flex-col items-center gap-2 px-6 py-10 border-2 border-solid transition-[border-color,opacity] duration-150"
      :class="[
        isSold(naming)
          ? 'external-naming-grid__card--sold border-black/10 cursor-not-allowed'
          : isSelected(naming)
            ? 'external-naming-grid__card--selected border-[#030213] cursor-pointer'
            : isDisabledForSelection(naming)
              ? 'external-naming-grid__card--disabled border-black/10 opacity-40 cursor-not-allowed'
              : 'border-black/10 hover:border-[#030213]/40 cursor-pointer',
      ]"
      @click="handleClick(naming)"
    >
      <div
        class="external-naming-grid__card-body flex flex-col items-center gap-2 w-full text-center tracking-[-0.1504px]"
        :class="isSold(naming) ? 'opacity-50' : ''"
      >
        <div class="external-naming-grid__card-heading flex flex-col gap-1 w-full">
          <p class="external-naming-grid__card-name text-[20px] font-medium leading-6 text-[#1a1a1a] w-full break-words">
            {{ naming.name }}
          </p>
          <p
            v-if="naming.domain"
            class="external-naming-grid__card-domain text-[12px] font-normal leading-4 text-[#4b4b58] w-full truncate"
          >
            ({{ naming.domain }})
          </p>
        </div>
        <p
          v-if="naming.price !== null && naming.price !== undefined"
          class="external-naming-grid__card-price text-[16px] font-medium leading-6 text-[#1a1a1a] w-full"
        >
          {{ formatPrice(naming.price) }}
        </p>
      </div>

      <div
        v-if="naming.availability_status === 'available'"
        class="external-naming-grid__badge external-naming-grid__badge--available backdrop-blur-[5px] flex items-center justify-center px-2 py-1 rounded-[8px] bg-[#d4fde5]"
      >
        <span
          class="text-[12px] font-medium leading-4 tracking-[-0.3125px] text-[#006929] whitespace-nowrap"
        >
          Available
        </span>
      </div>
      <div
        v-else-if="naming.availability_status === 'sold'"
        class="external-naming-grid__badge external-naming-grid__badge--sold backdrop-blur-[5px] flex items-center justify-center px-2 py-1 rounded-[100px] bg-[#fdd4d4] opacity-50"
      >
        <span
          class="text-[12px] font-medium leading-4 tracking-[-0.3125px] text-[#9e0101] whitespace-nowrap"
        >
          Sold
        </span>
      </div>

      <div
        v-if="isSelected(naming)"
        class="external-naming-grid__card-check absolute top-[6px] left-[6px] size-8 rounded-[100px] bg-[#030213] flex items-center justify-center"
      >
        <CheckIcon class="size-4 text-white" />
      </div>
    </div>
  </div>
  <div v-else class="external-naming-grid__empty text-center py-8 text-muted-foreground text-sm">
    Неймінги не знайдено
  </div>
</template>
