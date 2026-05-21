<script setup lang="ts">
interface Props {
  loading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :class="[
      'review-apply-ceo-button w-full h-12 rounded-xl border border-black/10 text-[14px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      loading ? 'review-apply-ceo-button--loading' : '',
    ]"
    :disabled="loading"
    @click="emit('click')"
  >
    {{ loading ? 'Застосовується…' : 'Застосувати варіант CEO' }}
  </button>
</template>
