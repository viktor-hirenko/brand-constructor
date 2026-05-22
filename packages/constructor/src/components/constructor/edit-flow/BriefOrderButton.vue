<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'

interface BriefOrderButtonProps {
  createLabel: string
  createdLabel: string
  isCreated: boolean
}

const props = defineProps<BriefOrderButtonProps>()

const emit = defineEmits<{
  create: []
  view: []
  edit: []
  delete: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const showDropdown = ref(false)

function handleMainClick() {
  if (props.isCreated) {
    showDropdown.value = !showDropdown.value
  } else {
    emit('create')
  }
}

function handleClickOutside(e: MouseEvent) {
  if (showDropdown.value && !containerRef.value?.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative self-start">
    <button
      v-if="!isCreated"
      type="button"
      class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[8px] transition-colors text-base font-medium leading-6 tracking-[-0.31px] bg-[rgba(3,2,19,0.1)] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]"
      @click="handleMainClick"
    >
      <PlusIcon class="size-4" />
      {{ createLabel }}
    </button>

    <button
      v-else
      type="button"
      class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[8px] transition-colors text-base font-medium leading-6 tracking-[-0.31px] bg-[#030213] text-white hover:opacity-90"
      @click="handleMainClick"
    >
      <CheckIcon class="size-4" />
      {{ createdLabel }}
      <ChevronDownIcon
        class="size-3 ml-1 transition-transform"
        :class="showDropdown ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="showDropdown"
      class="absolute top-full left-0 mt-1 w-56 bg-white rounded-[10px] shadow-[0px_10px_38px_-10px_rgba(22,23,24,0.35),0px_10px_20px_-15px_rgba(22,23,24,0.2)] border border-black/10 py-1 z-50"
    >
      <button
        type="button"
        class="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-[#f3f3f5] transition-colors"
        @click="showDropdown = false; emit('view')"
      >
        Переглянути бриф
      </button>
      <button
        type="button"
        class="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-[#f3f3f5] transition-colors"
        @click="showDropdown = false; emit('edit')"
      >
        Редагувати бриф
      </button>
      <button
        type="button"
        class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        @click="showDropdown = false; emit('delete')"
      >
        Видалити бриф
      </button>
    </div>
  </div>
</template>
