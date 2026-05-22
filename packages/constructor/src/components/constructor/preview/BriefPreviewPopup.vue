<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'

export interface BriefField {
  label: string
  value: string
}

interface BriefPreviewPopupProps {
  title: string
  subtitle?: string | null
  fields: BriefField[]
  showEdit?: boolean
}

const props = withDefaults(defineProps<BriefPreviewPopupProps>(), {
  subtitle: null,
  showEdit: false,
})

const emit = defineEmits<{
  edit: []
}>()

const store = useConstructorStore()

function handleClose() {
  store.closeBriefPreview()
}

function handleEdit() {
  store.closeBriefPreview()
  emit('edit')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') handleClose()
}

watch(
  () => props.title,
  () => {
    if (typeof document === 'undefined') return
    document.addEventListener('keydown', onKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <div
    class="flex flex-col h-full w-full bg-white px-6 pt-6 pb-6 gap-6"
    role="dialog"
    aria-modal="true"
    :aria-label="`Перегляд брифу ${title}`"
  >
    <header class="flex items-start justify-between gap-4 shrink-0">
      <div class="min-w-0 flex-1">
        <h2
          class="text-[24px] font-medium leading-8 tracking-[-0.4492px] text-[#0a0a0a] truncate"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="mt-2 text-base text-muted-foreground tracking-[-0.31px]"
        >
          {{ subtitle }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center size-12 shrink-0 rounded-full bg-[#f9f9fb] text-[#141B34] hover:bg-[#ececf0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8c7cc]"
        aria-label="Закрити"
        @click="handleClose"
      >
        <svg
          class="size-6"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </header>

    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
      <div
        v-for="field in fields"
        :key="field.label"
        class="p-4 bg-[#f3f3f5] rounded-[10px]"
      >
        <p class="text-xs text-muted-foreground mb-1">{{ field.label }}</p>
        <p class="text-sm whitespace-pre-line text-foreground">
          {{ field.value || '—' }}
        </p>
      </div>
    </div>

    <footer v-if="showEdit" class="shrink-0 pt-2">
      <button
        type="button"
        class="w-full h-10 rounded-[10px] bg-[#030213] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        @click="handleEdit"
      >
        Редагувати бриф
      </button>
    </footer>
  </div>
</template>
