<script setup lang="ts">
import { computed } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'

interface NamingMini {
  id: string
  name: string
  domain?: string
  price?: number | null
}

interface AuthorNamingsRowProps {
  namings: NamingMini[]
  /** When true, PO cards can be toggled into the CEO staged selection. */
  selectable?: boolean
  selectedIds?: string[]
  maxSelectable?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<AuthorNamingsRowProps>(), {
  selectable: false,
  selectedIds: () => [],
  maxSelectable: 3,
  disabled: false,
})

const emit = defineEmits<{
  toggle: [namingId: string]
  'select-all': []
}>()

const selectedSet = computed(() => new Set(props.selectedIds))
const isAtLimit = computed(() => props.selectedIds.length >= props.maxSelectable)

const allSelected = computed(
  () =>
    props.namings.length > 0 &&
    props.namings.every(n => selectedSet.value.has(n.id)),
)

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return ''
  return `$${price.toLocaleString('uk-UA').replace(/,/g, ' ')}`
}

function isSelected(id: string): boolean {
  return selectedSet.value.has(id)
}

function isDisabledForSelection(id: string): boolean {
  if (props.disabled || !props.selectable) return true
  if (!isSelected(id) && isAtLimit.value) return true
  return false
}

function handleToggle(id: string) {
  if (isDisabledForSelection(id)) return
  emit('toggle', id)
}

function handleSelectAll() {
  if (props.disabled || !props.selectable || allSelected.value) return
  emit('select-all')
}
</script>

<template>
  <div class="author-namings-row flex flex-col gap-3">
    <div class="author-namings-row__header flex items-center justify-between gap-3">
      <p class="author-namings-row__label text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
        Вибір замовника
      </p>
      <button
        v-if="selectable && namings.length > 0 && !allSelected"
        type="button"
        class="author-namings-row__select-all text-[14px] font-medium leading-5 text-[#030213] underline underline-offset-2 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="disabled || isAtLimit"
        @click="handleSelectAll"
      >
        Обрати ці назви
      </button>
    </div>
    <div
      v-if="namings.length > 0"
      class="author-namings-row__grid grid grid-cols-3 gap-2 max-w-[506px]"
    >
      <div
        v-for="n in namings"
        :key="n.id"
        class="author-namings-row__card relative box-border rounded-[16px] flex flex-col items-center gap-2 px-6 py-10 text-center tracking-[-0.1504px] border-2 border-solid transition-[border-color,opacity,background-color] duration-150"
        :class="[
          selectable
            ? isSelected(n.id)
              ? 'author-namings-row__card--selected bg-white border-[#030213] cursor-pointer'
              : isDisabledForSelection(n.id)
                ? 'author-namings-row__card--disabled bg-[#f1f1f3] border-black/10 opacity-40 cursor-not-allowed'
                : 'author-namings-row__card--selectable bg-[#f1f1f3] border-black/10 hover:border-[#030213]/40 cursor-pointer'
            : 'bg-[#f1f1f3] border-black/10',
        ]"
        @click="handleToggle(n.id)"
      >
        <div class="flex flex-col gap-1 w-full">
          <p class="text-[20px] font-medium leading-6 text-[#1a1a1a] break-words w-full">
            {{ n.name }}
          </p>
          <p
            v-if="n.domain"
            class="text-[12px] font-normal leading-4 text-[#4b4b58] truncate w-full"
          >
            ({{ n.domain }})
          </p>
        </div>
        <p
          v-if="formatPrice(n.price)"
          class="text-[16px] font-medium leading-6 text-[#1a1a1a] w-full"
        >
          {{ formatPrice(n.price) }}
        </p>

        <div
          v-if="selectable && isSelected(n.id)"
          class="author-namings-row__card-check absolute top-[6px] left-[6px] size-8 rounded-[100px] bg-[#030213] flex items-center justify-center"
        >
          <CheckIcon class="size-4 text-white" />
        </div>
      </div>
    </div>
    <p
      v-else
      class="author-namings-row__empty text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Назви не обрано
    </p>
  </div>
</template>
