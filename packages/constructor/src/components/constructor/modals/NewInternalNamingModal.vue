<script setup lang="ts">
import { ref, computed } from 'vue'
import BriefModalShell from '@/components/constructor/modals/BriefModalShell.vue'

const props = withDefaults(
  defineProps<{
    initialFeedback?: string | null
    /** Render as read-only preview (reuses the same markup as edit). */
    readonly?: boolean
    /** Show «Редагувати» primary action (only meaningful when `readonly`). */
    showEditAction?: boolean
  }>(),
  { readonly: false, showEditAction: false },
)

const emit = defineEmits<{
  save: [feedback: string]
  cancel: []
  edit: []
}>()

const isEditMode = !!props.initialFeedback
const feedback = ref(props.initialFeedback ?? '')

const isValid = computed(() => feedback.value.trim() !== '')

function handleSave() {
  if (props.readonly) return
  if (isValid.value) emit('save', feedback.value.trim())
}

const title = computed(() => {
  if (props.readonly) return 'Бриф нової Internal Naming'
  return isEditMode ? 'Редагування брифу назви' : 'Замовити нову внутрішню назву'
})
</script>

<template>
  <BriefModalShell
    :title="title"
    :is-valid="isValid"
    :readonly="readonly"
    :show-edit-action="showEditAction"
    size="md"
    @cancel="emit('cancel')"
    @save="handleSave"
    @edit="emit('edit')"
  >
    <fieldset :disabled="readonly" class="brief-form m-0 p-0 border-0 min-w-0 flex flex-col gap-2">
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
    </fieldset>
  </BriefModalShell>
</template>

<style scoped>
.brief-form:disabled {
  opacity: 1;
}
.brief-form:disabled :deep(input),
.brief-form:disabled :deep(textarea),
.brief-form:disabled :deep(select),
.brief-form:disabled :deep(button) {
  opacity: 1 !important;
  cursor: default;
}
</style>
