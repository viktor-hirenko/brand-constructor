<script setup lang="ts">
import { computed } from 'vue'
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import {
  UI_ACCORDION_CHEVRON_CLASS,
  UI_ACCORDION_CONTENT_CLASS,
  UI_ACCORDION_HEADER_TITLE_CLASS,
  UI_ACCORDION_HEADER_TITLE_GROUP_CLASS,
  UI_ACCORDION_ITEM_CLASS,
  resolveUiAccordionHeaderClasses,
} from '@/components/ui/uiAccordion'

/**
 * One expandable section — the kit's `Accordion open` `3839:12607`, whose
 * States are Default / Hovered / Disabled / Open. Recipe in `uiAccordion.ts`.
 *
 *   <UiAccordionItem :title="type.name" :open="isOpen" @toggle="toggle(type.id)">
 *     <template #badge><UiBadge … /></template>
 *     <UiAccordionOption v-for="…" />
 *   </UiAccordionItem>
 *
 * `open` is a prop, not internal state: the step allows exactly one section
 * open at a time, and that rule belongs to the screen, not to the section.
 *
 * The height animation is the same four-hook dance the view carried before,
 * moved here whole. It measures `scrollHeight` at runtime, so the px it writes
 * are real pixels rather than geometry that owes anything to the embed scale.
 */
interface UiAccordionItemProps {
  title: string
  open?: boolean
  /** Kit State = Disabled. The delegate branch disables the list instead. */
  disabled?: boolean
}

const props = withDefaults(defineProps<UiAccordionItemProps>(), {
  open: false,
  disabled: false,
})

const emit = defineEmits<{ toggle: [] }>()

const headerClass = computed(() => resolveUiAccordionHeaderClasses({ disabled: props.disabled }))

function onEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.transition = 'height 0.25s ease'
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}

function onLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight
  htmlEl.style.height = '0'
  htmlEl.style.transition = 'height 0.25s ease'
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}
</script>

<template>
  <div :class="UI_ACCORDION_ITEM_CLASS">
    <button
      type="button"
      :class="headerClass"
      :disabled="props.disabled"
      :aria-expanded="props.open"
      @click="emit('toggle')"
    >
      <span :class="UI_ACCORDION_HEADER_TITLE_GROUP_CLASS">
        <span :class="UI_ACCORDION_HEADER_TITLE_CLASS">{{ props.title }}</span>
        <slot name="badge" />
      </span>
      <ChevronDownIcon
        :class="[UI_ACCORDION_CHEVRON_CLASS, { 'rotate-180': props.open }]"
      />
    </button>

    <Transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
      <div v-if="props.open" class="overflow-hidden">
        <UiDivider />
        <div :class="UI_ACCORDION_CONTENT_CLASS">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>
