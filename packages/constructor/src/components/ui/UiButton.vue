<script setup lang="ts">
import { computed } from 'vue'

interface UiButtonProps {
  variant?: 'primary' | 'secondary'
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
  /** Equal-width footer buttons (`flex-1`). */
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<UiButtonProps>(), {
  variant: 'primary',
  loading: false,
  loadingLabel: 'Зачекайте…',
  disabled: false,
  block: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isDisabled = computed(() => props.disabled || props.loading)

const buttonClass = computed(() => [
  'ui-button inline-flex items-center justify-center rounded-[8px] p-3 text-[1rem] font-medium leading-6 tracking-[-0.3125px]',
  props.block ? 'flex-1' : '',
  props.variant === 'primary'
    ? 'bg-[#030213] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
    : 'border border-black/10 bg-white text-[#0a0a0a] transition-colors hover:bg-black/[0.02] disabled:opacity-40',
])
</script>

<template>
  <button
    :type="type"
    :class="buttonClass"
    :disabled="isDisabled"
    @click="emit('click', $event)"
  >
    <template v-if="loading">{{ loadingLabel }}</template>
    <slot v-else />
  </button>
</template>
