<script setup lang="ts">
import { ref, computed } from 'vue'
import BriefModalShell from '@/components/constructor/modals/BriefModalShell.vue'

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
  if (isValid.value) emit('save', feedback.value.trim())
}
</script>

<template>
  <BriefModalShell
    :title="isEditMode ? 'Редагування брифу назви' : 'Замовити нову внутрішню назву'"
    :is-valid="isValid"
    size="md"
    @cancel="emit('cancel')"
    @save="handleSave"
  >
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
  </BriefModalShell>
</template>
