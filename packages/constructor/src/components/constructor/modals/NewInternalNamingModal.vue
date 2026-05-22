<script setup lang="ts">
import { ref, computed } from 'vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'

const props = defineProps<{
  initialFeedback?: string | null
}>()

const emit = defineEmits<{
  save: [feedback: string]
  cancel: []
}>()

const isEditMode = !!props.initialFeedback
const feedback = ref(props.initialFeedback ?? '')

const isValid = computed(() => feedback.value.trim() !== '')

function handleSave() {
  if (isValid.value) {
    emit('save', feedback.value.trim())
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('cancel')" />

      <!-- Modal -->
      <div
        class="relative bg-white rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[560px] mx-4 max-h-[90vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-8 pt-8 pb-4">
          <h2 class="text-xl font-medium text-[#0a0a0a] tracking-[-0.45px]">
            {{ isEditMode ? 'Редагування брифу назви' : 'Замовити нову внутрішню назву' }}
          </h2>
          <button
            class="size-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
            @click="emit('cancel')"
          >
            <CloseIcon class="size-5 text-[#717182]" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-8 pb-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[#0a0a0a] tracking-[-0.15px]">
              1. Опис, що не підійшло в запропонованих неймінгах
              <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="feedback"
              rows="5"
              class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Опишіть, що саме не підійшло та що б ви хотіли бачити..."
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-8 pb-8 pt-4 border-t border-black/5">
          <button
            class="h-[42px] px-5 border border-black/10 text-[#0a0a0a] rounded-[10px] hover:bg-black/[0.02] transition-all text-sm font-medium"
            @click="emit('cancel')"
          >
            Скасувати
          </button>
          <button
            :disabled="!isValid"
            class="h-[42px] px-5 bg-[#030213] text-white rounded-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all text-sm font-medium"
            @click="handleSave"
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
