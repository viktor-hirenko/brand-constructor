<script setup lang="ts">
import CloseIcon from '@/components/icons/CloseIcon.vue'
import { useEscapeClose } from '@/composables/useEscapeClose'

interface BriefModalShellProps {
  title: string
  isValid: boolean
  /** 'lg' = fixed 672px wide (default); 'md' = fluid max-w-[560px] */
  size?: 'md' | 'lg'
}

const props = withDefaults(defineProps<BriefModalShellProps>(), {
  size: 'lg',
})

const emit = defineEmits<{
  cancel: []
  save: []
}>()

useEscapeClose(() => emit('cancel'))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />

      <div
        class="relative bg-white rounded-[16px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] max-h-[85vh] flex flex-col"
        :class="props.size === 'lg' ? 'w-[672px]' : 'w-full max-w-[560px] mx-4'"
      >
        <div
          class="flex items-center justify-between h-[73px] px-6 border-b border-black/10 shrink-0"
        >
          <h2 class="text-xl font-semibold leading-[28px] tracking-[-0.45px] text-[#0a0a0a]">
            {{ title }}
          </h2>
          <button
            type="button"
            class="size-10 rounded-full bg-[#ececf0] flex items-center justify-center hover:bg-[#dddde2] transition-colors"
            @click="emit('cancel')"
          >
            <CloseIcon class="size-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <slot />
        </div>

        <div
          class="flex items-start justify-end gap-3 px-6 pt-[17px] pb-4 border-t border-black/10 shrink-0"
        >
          <button
            type="button"
            class="h-[46px] px-6 border border-black/10 rounded-[10px] text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a] hover:bg-black/[0.02] transition-all"
            @click="emit('cancel')"
          >
            Скасувати
          </button>
          <button
            type="button"
            :disabled="!isValid"
            class="h-[46px] px-6 bg-[#030213] text-white rounded-[10px] text-base font-medium leading-6 tracking-[-0.31px] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all"
            @click="emit('save')"
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
