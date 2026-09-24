<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import CaretDownIcon from '@/components/icons/CaretDownIcon.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'

/**
 * Order-a-brief control on steps 2, 3 and 4.
 *
 * The "not yet created" state is drawn in the kit: `5382:44787` on the Concept
 * Selection screen of the new canvas is a 222×40 instance whose
 * `get_variable_defs` returns `button/neutral/bg/default` #eaeaeb,
 * `button/neutral/content/default` #1f1f2e, `caption/l/medium` 14/16,
 * `spacing/12`, `spacing/4`, `radius/button` 8 — kit Neutral at M-40. The
 * height was already 40 here; what changes is the label, 16/24 → the kit's
 * 14/16, and the tint, `rgba(3,2,19,0.1)` → the neutral surface.
 *
 * The "created" state is ours — the kit draws no such toggle — so it takes the
 * nearest kit style, Primary, at the same M-40, because the two states swap in
 * one slot and must not resize it.
 *
 * The dropdown below is NOT converted: the kit renders that as List item
 * (`3446:5054`) inside a Popover (`3446:5235`), and both are phase 11.
 */

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
    <UiButton
      v-if="!isCreated"
      variant="neutral"
      size="M"
      class="brief-order-button brief-order-button--create"
      @click="handleMainClick"
    >
      <template #icon-left="{ iconClass }">
        <PlusIcon :class="iconClass" />
      </template>
      {{ createLabel }}
    </UiButton>

    <UiButton
      v-else
      variant="primary"
      size="M"
      class="brief-order-button brief-order-button--created"
      @click="handleMainClick"
    >
      <template #icon-left="{ iconClass }">
        <CheckIcon :class="iconClass" />
      </template>
      {{ createdLabel }}
      <template #icon-right="{ iconClass }">
        <CaretDownIcon
          :class="[iconClass, 'transition-transform', showDropdown ? 'rotate-180' : '']"
        />
      </template>
    </UiButton>

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
