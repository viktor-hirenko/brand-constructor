<script setup lang="ts">
import { computed, useSlots } from 'vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import {
  resolveUiAlertClasses,
  resolveUiAlertRole,
  type UiAlertType,
} from '@/components/ui/uiAlert'

/**
 * Kit alert — Figma `3461:5236`, five types.
 *
 * The icon is a slot with the resolved tone class handed back to the caller, so
 * a call site can swap the glyph without re-deriving the colour; the default is
 * the filled info circle the kit draws in every type.
 */
interface UiAlertProps {
  type?: UiAlertType
  title?: string
  /** Plain-text body. For rich content use the default slot instead. */
  description?: string
}

const props = withDefaults(defineProps<UiAlertProps>(), {
  type: 'default',
  title: '',
  description: '',
})

const slots = useSlots()

const classes = computed(() => resolveUiAlertClasses(props.type))
const role = computed(() => resolveUiAlertRole(props.type))
const hasBody = computed(() => Boolean(slots.default) || Boolean(props.description))
</script>

<template>
  <div :class="classes.root" :role="role">
    <slot name="icon" :icon-class="classes.icon">
      <InfoCircleFilledIcon :class="classes.icon" />
    </slot>

    <div :class="classes.text">
      <p v-if="title" :class="classes.title">{{ title }}</p>

      <div v-if="hasBody" :class="classes.description">
        <slot>{{ description }}</slot>
      </div>

      <div v-if="slots.actions" :class="classes.actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
