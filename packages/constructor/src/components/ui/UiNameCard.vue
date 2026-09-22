<script setup lang="ts">
import { computed } from 'vue'
import {
  formatUiNameCardPrice,
  resolveUiNameCardBadge,
  resolveUiNameCardClasses,
  UI_NAME_CARD_BADGE_SLOT_CLASS,
  UI_NAME_CARD_DOMAIN_CLASS,
  UI_NAME_CARD_META_CLASS,
  UI_NAME_CARD_NAME_CLASS,
  UI_NAME_CARD_PRICE_CLASS,
  UI_NAME_CARD_TEXT_CLASS,
} from '@/components/ui/uiNameCard'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'

/**
 * Kit name card — Figma `3719:5978`, the row that replaces the square tiles on
 * steps 3 and 4. Numbers and colours: see `uiNameCard.ts`.
 *
 * The whole row is the control: it renders a `<button>` and the checkbox inside
 * it is presentational. `aria-pressed` carries the selected state, because the
 * screens this serves pick names out of a list rather than toggling independent
 * options.
 *
 * Step 4 (phase 15) needs the name and nothing else, and is 64 tall. Step 3
 * (phase 16) switches on the three slots the kit card also carries — the domain
 * line, the price and the availability badge — and is 76. `detailed` is what
 * says which, and it is a property of the list, not of the row: a naming with
 * no domain still keeps its neighbours' height, so the list stays even.
 */
interface UiNameCardProps {
  name: string
  selected?: boolean
  disabled?: boolean
  /**
   * A display of a pick someone else made — the alternative flow's «Вибір
   * замовника» (`5387:105118`). Renders a plain `<div>`: the kit draws it as
   * this same card in State = Default, but there is nothing to click.
   */
  readonly?: boolean
  /** Step 3's layout: domain under the name, price and badge on the right. */
  detailed?: boolean
  domain?: string | null
  price?: number | null
  /** `available` / `sold`; anything else draws no badge. */
  availability?: string | null
  /**
   * Keep the badge column even in rows that have no badge, so the prices line
   * up. Set by lists whose rows carry availability; «Вибір замовника» does not,
   * and there the column would be empty air.
   */
  reserveBadge?: boolean
}

const props = withDefaults(defineProps<UiNameCardProps>(), {
  selected: false,
  disabled: false,
  readonly: false,
  detailed: false,
  domain: null,
  price: null,
  availability: null,
  reserveBadge: false,
})

const emit = defineEmits<{
  select: []
}>()

const classes = computed(() =>
  resolveUiNameCardClasses({
    selected: props.selected,
    disabled: props.disabled,
    readonly: props.readonly,
    detailed: props.detailed,
  })
)

/** A display is a `<div>`; everything else is the row-sized button. */
const tag = computed(() => (props.readonly ? 'div' : 'button'))

const controlAttrs = computed(() =>
  props.readonly
    ? {}
    : { type: 'button' as const, disabled: props.disabled, 'aria-pressed': props.selected }
)

const priceLabel = computed(() => formatUiNameCardPrice(props.price))
const badge = computed(() => resolveUiNameCardBadge(props.availability))

function handleClick() {
  if (props.disabled || props.readonly) return
  emit('select')
}
</script>

<template>
  <component :is="tag" v-bind="controlAttrs" :class="classes" @click="handleClick">
    <UiCheckbox :checked="selected" />
    <span :class="UI_NAME_CARD_TEXT_CLASS">
      <span :class="UI_NAME_CARD_NAME_CLASS">{{ name }}</span>
      <span v-if="detailed && domain" :class="UI_NAME_CARD_DOMAIN_CLASS">({{ domain }})</span>
    </span>
    <!-- The 140 block is drawn on every instance, so the badge stays flush with
         the card's right padding even when a naming carries no price. The badge
         column inside it is reserved at the widest badge's width, which is what
         keeps the right-aligned prices in one line down a mixed list. -->
    <span v-if="detailed" :class="UI_NAME_CARD_META_CLASS">
      <span :class="UI_NAME_CARD_PRICE_CLASS">{{ priceLabel }}</span>
      <span v-if="reserveBadge" :class="UI_NAME_CARD_BADGE_SLOT_CLASS">
        <UiBadge v-if="badge" :tone="badge.tone" :label="badge.label" />
      </span>
      <UiBadge v-else-if="badge" :tone="badge.tone" :label="badge.label" />
    </span>
  </component>
</template>
