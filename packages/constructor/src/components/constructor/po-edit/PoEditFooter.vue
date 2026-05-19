<script setup lang="ts">
interface PoEditFooterProps {
  cancelLabel?: string
  primaryLabel?: string
  primaryDisabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<PoEditFooterProps>(), {
  cancelLabel: 'Скасувати',
  primaryLabel: 'Зберегти',
  primaryDisabled: false,
  loading: false,
})

const emit = defineEmits<{
  cancel: []
  primary: []
}>()
</script>

<template>
  <div
    class="sticky bottom-0 z-10 flex items-center gap-3 h-[97px] shrink-0 border-t border-black/10 bg-[#f9f9fb] px-1 pt-4 -mx-1"
  >
    <button
      type="button"
      class="flex-1 h-12 rounded-[10px] border border-black/10 text-[16px] font-medium text-[#030213] hover:bg-black/[0.02] transition-colors disabled:opacity-40"
      :disabled="loading"
      @click="emit('cancel')"
    >
      {{ cancelLabel }}
    </button>
    <button
      type="button"
      class="flex-1 h-12 rounded-[10px] bg-[#030213] text-white text-[16px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="primaryDisabled || loading"
      @click="emit('primary')"
    >
      {{ loading ? 'Збереження…' : primaryLabel }}
    </button>
  </div>
</template>
