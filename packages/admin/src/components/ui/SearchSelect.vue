<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import caretDown from '@phosphor-icons/core/regular/caret-down.svg?raw'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import {
  filterOptions,
  moveHighlight,
  selectedLabel,
  type SearchSelectOption,
} from '@/utils/searchSelect'

/**
 * A choice out of a long list by typing: the field shows what is chosen,
 * typing leaves the options that match, arrows and Enter or a click pick one.
 * For lists that grow with the library — concepts — where a plain `<select>`
 * is scrolled rather than read (owner, 07.10).
 *
 * The list is drawn over the page, not inside the field's container: in a
 * modal the body scrolls, and a list inside it would be cut off at its edge.
 */
const props = withDefaults(
  defineProps<{
    options: SearchSelectOption[]
    /** Shown in the open, empty field. */
    placeholder?: string
    id?: string
    ariaLabel?: string
  }>(),
  { placeholder: 'Почніть вводити назву…', id: undefined, ariaLabel: undefined }
)

const model = defineModel<string | null>({ required: true })

const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLUListElement | null>(null)
const open = ref(false)
const query = ref('')
const highlighted = ref(-1)
const listStyle = ref<Record<string, string>>({})

const listId = computed(() => `${props.id ?? 'search-select'}-list`)
const matches = computed(() => filterOptions(props.options, query.value))
const shown = computed(() => (open.value ? query.value : selectedLabel(props.options, model.value)))

const LIST_MAX_HEIGHT = 240

/** Under the field, or above it when there is more room there. */
function place() {
  const field = input.value?.getBoundingClientRect()
  if (!field) return
  const below = window.innerHeight - field.bottom
  const up = below < LIST_MAX_HEIGHT + 8 && field.top > below
  listStyle.value = {
    left: `${field.left}px`,
    width: `${field.width}px`,
    maxHeight: `${Math.min(LIST_MAX_HEIGHT, (up ? field.top : below) - 8)}px`,
    ...(up ? { bottom: `${window.innerHeight - field.top + 4}px` } : { top: `${field.bottom + 4}px` }),
  }
}

function onScroll(event: Event) {
  // The list's own scroll is not the page moving away from under it.
  if (event.target instanceof Node && list.value?.contains(event.target)) return
  place()
}

function show() {
  if (open.value) return
  open.value = true
  query.value = ''
  highlighted.value = props.options.findIndex(option => option.value === model.value)
  place()
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', place)
  void nextTick(scrollToHighlighted)
}

function hide() {
  if (!open.value) return
  open.value = false
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', place)
}

function pick(option: SearchSelectOption) {
  model.value = option.value
  hide()
}

function scrollToHighlighted() {
  list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
}

function onInput(event: Event) {
  open.value || show()
  query.value = (event.target as HTMLInputElement).value
  highlighted.value = matches.value.length > 0 ? 0 : -1
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) return show()
    highlighted.value = moveHighlight(highlighted.value, event.key === 'ArrowDown' ? 1 : -1, matches.value.length)
    void nextTick(scrollToHighlighted)
  } else if (event.key === 'Enter' && open.value) {
    // Never the form's submit: Enter here means «this one».
    event.preventDefault()
    const option = matches.value[highlighted.value]
    if (option) pick(option)
  } else if (event.key === 'Escape' && open.value) {
    // Closes the list, not the modal the field is in.
    event.stopPropagation()
    hide()
  }
}

watch(matches, () => void nextTick(place))
onBeforeUnmount(hide)
</script>

<template>
  <div class="search-select">
    <input
      :id="id"
      ref="input"
      class="search-select__input"
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      :value="shown"
      :placeholder="open ? placeholder : ''"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open && highlighted >= 0 ? `${listId}-${highlighted}` : undefined"
      aria-autocomplete="list"
      @focus="show"
      @click="show"
      @input="onInput"
      @keydown="onKeydown"
      @blur="hide"
    />
    <PhosphorIcon :svg="caretDown" class="search-select__caret" />
    <Teleport to="body">
      <ul v-if="open" :id="listId" ref="list" class="search-select__list" role="listbox" :style="listStyle">
        <li
          v-for="(option, index) in matches"
          :id="`${listId}-${index}`"
          :key="option.value ?? ''"
          class="search-select__option"
          :class="{
            'search-select__option--highlighted': index === highlighted,
            'search-select__option--chosen': option.value === model,
          }"
          role="option"
          :aria-selected="index === highlighted"
          @mousedown.prevent="pick(option)"
          @mousemove="highlighted = index"
        >
          {{ option.label }}
        </li>
        <li v-if="matches.length === 0" class="search-select__empty">Нічого не знайдено</li>
      </ul>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.search-select {
  position: relative;
  display: block;

  // The same field as BaseInput and the selects it replaces.
  &__input {
    width: 100%;
    padding: $spacing-2 $spacing-8 $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-family: inherit;
    font-size: $font-size-sm;
    color: $color-text;
    background-color: $color-bg-white;
    text-overflow: ellipsis;
    transition: border-color $transition-fast;

    &:focus {
      outline: none;
      border-color: $color-border-focus;
      box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
    }

    &::placeholder {
      color: $color-text-muted;
    }
  }

  &__caret {
    position: absolute;
    top: 50%;
    right: $spacing-3;
    width: 14px;
    height: 14px;
    transform: translateY(-50%);
    color: $color-text-secondary;
    pointer-events: none;
  }

  // Drawn over the page (Teleport), above a modal it may be opened from.
  &__list {
    position: fixed;
    z-index: $z-modal + 5;
    margin: 0;
    padding: $spacing-1 0;
    overflow-y: auto;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background-color: $color-bg-white;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    list-style: none;
  }

  &__option {
    padding: $spacing-2 $spacing-3;
    font-size: $font-size-sm;
    color: $color-text;
    cursor: pointer;

    &--chosen {
      font-weight: $font-weight-medium;
    }

    &--highlighted {
      background-color: $color-primary-light;
    }
  }

  &__empty {
    padding: $spacing-2 $spacing-3;
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }
}
</style>
