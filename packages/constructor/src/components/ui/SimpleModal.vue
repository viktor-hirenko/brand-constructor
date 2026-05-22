<script setup lang="ts">
import CloseIcon from '@/components/icons/CloseIcon.vue'

interface SimpleModalProps {
  title: string
  body: string
  cancelLabel?: string
  primaryLabel: string
  primaryLoading?: boolean
}

withDefaults(defineProps<SimpleModalProps>(), {
  cancelLabel: 'Скасувати',
  primaryLoading: false,
})

const emit = defineEmits<{
  cancel: []
  primary: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="simple-modal fixed inset-0 z-[9999] flex items-center justify-center">
      <!-- Backdrop -->
      <div
        class="simple-modal__backdrop absolute inset-0 bg-black/40"
        @click="emit('cancel')"
      />
      <!-- Dialog -->
      <div class="simple-modal__dialog relative bg-white rounded-2xl shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-sm mx-4 px-6 pt-6 pb-5 flex flex-col gap-4">
        <button
          type="button"
          class="simple-modal__close absolute top-4 right-4 size-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          aria-label="Закрити"
          @click="emit('cancel')"
        >
          <CloseIcon class="size-4 text-[#5B5B62]" />
        </button>

        <div class="simple-modal__body flex flex-col gap-2 pr-6">
          <h3 class="simple-modal__title text-[18px] font-medium leading-6 tracking-[-0.1504px] text-[#0a0a0a]">
            {{ title }}
          </h3>
          <p class="simple-modal__text text-[14px] leading-5 tracking-[-0.1504px] text-[#5B5B62]">
            {{ body }}
          </p>
        </div>

        <div class="simple-modal__actions flex items-center gap-3 pt-1">
          <button
            type="button"
            class="simple-modal__cancel flex-1 h-10 rounded-xl border border-black/10 text-[14px] font-medium text-[#373737] hover:bg-black/[0.03] transition-colors"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="simple-modal__primary flex-1 h-10 rounded-xl bg-[#030213] text-white text-[14px] font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="primaryLoading"
            @click="emit('primary')"
          >
            {{ primaryLoading ? 'Зачекайте…' : primaryLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
