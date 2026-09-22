<script setup lang="ts">
import { computed } from 'vue'
import {
  UI_ACCORDION_OPTION_DESCRIPTION_CLASS,
  UI_ACCORDION_OPTION_ICON_CLASS,
  UI_ACCORDION_OPTION_PREVIEW_CLASS,
  UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS,
  UI_ACCORDION_OPTION_TEXT_CLASS,
  UI_ACCORDION_OPTION_TITLE_CLASS,
  resolveUiAccordionOptionClasses,
} from '@/components/ui/uiAccordion'

/**
 * A row inside a section — the kit's `Accordion item` `3839:12381`, States
 * Default / Hovered / Selected. Recipe in `uiAccordion.ts`.
 *
 * Named `Option` rather than `Item` because the plan gave `UiAccordionItem` to
 * the section; the kit's own names are the other way round and the file-level
 * comment in `uiAccordion.ts` says so.
 *
 * `preview` is the variant letter, not a picture: the design dropped the 64×64
 * thumbnail and kept a grey tile with a glyph in it.
 */
interface UiAccordionOptionProps {
  /** The glyph in the preview tile — a variant letter in the one call site. */
  preview?: string
  title: string
  /** Second line, `accordion/content/description`. Omitted when empty. */
  description?: string | null
  selected?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<UiAccordionOptionProps>(), {
  preview: '',
  description: null,
  selected: false,
  disabled: false,
})

const emit = defineEmits<{ select: [] }>()

const rootClass = computed(() =>
  resolveUiAccordionOptionClasses({ selected: props.selected, disabled: props.disabled })
)
</script>

<template>
  <button type="button" :class="rootClass" :disabled="props.disabled" @click="emit('select')">
    <span :class="UI_ACCORDION_OPTION_PREVIEW_CLASS">
      <span :class="UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS">{{ props.preview }}</span>
    </span>
    <span :class="UI_ACCORDION_OPTION_TEXT_CLASS">
      <span :class="UI_ACCORDION_OPTION_TITLE_CLASS">{{ props.title }}</span>
      <span v-if="props.description" :class="UI_ACCORDION_OPTION_DESCRIPTION_CLASS">
        {{ props.description }}
      </span>
    </span>
    <slot name="trailing" :icon-class="UI_ACCORDION_OPTION_ICON_CLASS" />
  </button>
</template>
