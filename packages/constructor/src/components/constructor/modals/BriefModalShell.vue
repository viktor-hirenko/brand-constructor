<script setup lang="ts">
import { computed } from 'vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useEscapeClose } from '@/composables/useEscapeClose'

interface BriefModalShellProps {
  title: string
  isValid?: boolean
  /** 'lg' = fixed 672px wide (default); 'md' = fluid max-w-[560px] */
  size?: 'md' | 'lg'
  /**
   * Read-only mode: shell renders the form (slot) as disabled and replaces
   * the «Зберегти» action with optional «Редагувати». Used by brief preview
   * overlays that reuse `New*Modal` components without duplicating markup.
   */
  readonly?: boolean
  /** Show «Редагувати» primary action in read-only mode. */
  showEditAction?: boolean
}

const props = withDefaults(defineProps<BriefModalShellProps>(), {
  isValid: true,
  size: 'lg',
  readonly: false,
  showEditAction: false,
})

const emit = defineEmits<{
  cancel: []
  save: []
  edit: []
}>()

useEscapeClose(() => emit('cancel'))

/** Whether the modal footer is shown (edit: cancel/save; read-only: edit action only, or none). */
const showFooter = computed(() => !props.readonly || props.showEditAction)
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
          <h2 class="text-xl font-semibold leading-[1.75rem] tracking-[-0.45px] text-[#0a0a0a]">
            {{ title }}
          </h2>
          <button
            type="button"
            class="size-10 rounded-full bg-[#ececf0] flex items-center justify-center hover:bg-[#dddde2] transition-colors"
            aria-label="Закрити"
            @click="emit('cancel')"
          >
            <CloseIcon class="size-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <slot />
        </div>

        <div
          v-if="showFooter"
          class="flex items-stretch justify-end gap-2 px-6 pt-[17px] pb-4 border-t border-black/10 shrink-0"
        >
          <UiButton v-if="!readonly" variant="secondary" @click="emit('cancel')">
            Скасувати
          </UiButton>
          <UiButton
            v-if="!readonly"
            variant="primary"
            :disabled="!isValid"
            @click="emit('save')"
          >
            Зберегти
          </UiButton>
          <UiButton
            v-else-if="showEditAction"
            variant="primary"
            @click="emit('edit')"
          >
            Редагувати
          </UiButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
