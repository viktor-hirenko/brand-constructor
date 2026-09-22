<script setup lang="ts">
import { computed } from 'vue'
import UiLink from '@/components/ui/UiLink.vue'
import UiNameCard from '@/components/ui/UiNameCard.vue'
import { UI_NAME_CARD_LIST_CLASS } from '@/components/ui/uiNameCard'

/**
 * «Вибір замовника» above the external naming list in the CEO alternative flow.
 *
 * The designer draws the customer's picks as the same kit `Name card` the list
 * below now uses — one column at the container's full width, 76 tall, domain
 * under the name and the price on the right. Measured on `5395:107506` («Вибір
 * CEO», one Name card 527×76 under a 24 label with a 12 gap) and on
 * `5387:105118`, which is the same block in the internal naming flow.
 *
 * It used to be a three-column grid of hand-drawn grey tiles 128 tall, with two
 * colours the kit does not contain — the same defect QA caught on the internal
 * one in phase 15. The guard test forbids those literals here.
 *
 * Only the look changes: the props and both events are unchanged, so the single
 * call site (`AlternativeExternalNamingView`) is untouched.
 */
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
      <p class="author-namings-row__label text-[1rem] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
        Вибір замовника
      </p>
      <!-- The mockup draws no action here at all — this one is ours. The kit's
           nearest primitive is Link `4378:8358`, which is what a text action is
           in this system; phase 10 assigned this button to phase 16. -->
      <UiLink
        v-if="selectable && namings.length > 0 && !allSelected"
        class="author-namings-row__select-all"
        :disabled="disabled || isAtLimit"
        @click="handleSelectAll"
      >
        Обрати ці назви
      </UiLink>
    </div>
    <div
      v-if="namings.length > 0"
      :class="['author-namings-row__grid', UI_NAME_CARD_LIST_CLASS]"
    >
      <UiNameCard
        v-for="n in namings"
        :key="n.id"
        detailed
        :name="n.name"
        :domain="n.domain"
        :price="n.price"
        :readonly="!selectable"
        :selected="selectable && isSelected(n.id)"
        :disabled="selectable && isDisabledForSelection(n.id)"
        @select="handleToggle(n.id)"
      />
    </div>
    <p
      v-else
      class="author-namings-row__empty text-[1rem] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Назви не обрано
    </p>
  </div>
</template>
