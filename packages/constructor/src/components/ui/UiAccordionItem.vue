<script setup lang="ts">
import { computed } from 'vue'
import CaretDownIcon from '@/components/icons/CaretDownIcon.vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import {
  UI_ACCORDION_CHEVRON_BUTTON_CLASS,
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
 *     <template #actions><button …>eye</button></template>
 *     <UiAccordionOption v-for="…" />
 *   </UiAccordionItem>
 *
 * `open` is a prop, not internal state: the step allows exactly one section
 * open at a time, and that rule belongs to the screen, not to the section.
 *
 * **The header is a row of three, not one button — DP-15450 `visual
 * components 4`.** The kit's `Visibility Icon` slot (`5382:33737`) sits
 * between the title and the chevron and carries a control of its own, and
 * HTML forbids a button inside a button. So the title group and the chevron
 * are each their own button onto the same `toggle`, and `#actions` renders
 * between them untouched. The title button is `flex-1`, so everything the
 * whole-row button used to cover still opens the section; the chevron button
 * is out of the tab order because the title one already names the control and
 * carries `aria-expanded`.
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
    <div :class="headerClass">
      <button
        type="button"
        :class="UI_ACCORDION_HEADER_TITLE_GROUP_CLASS"
        :disabled="props.disabled"
        :aria-expanded="props.open"
        @click="emit('toggle')"
      >
        <span :class="UI_ACCORDION_HEADER_TITLE_CLASS">{{ props.title }}</span>
        <slot name="badge" />
      </button>

      <slot name="actions" />

      <button
        type="button"
        :class="UI_ACCORDION_CHEVRON_BUTTON_CLASS"
        :disabled="props.disabled"
        tabindex="-1"
        aria-hidden="true"
        @click="emit('toggle')"
      >
        <CaretDownIcon :class="[UI_ACCORDION_CHEVRON_CLASS, { 'rotate-180': props.open }]" />
      </button>
    </div>

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
