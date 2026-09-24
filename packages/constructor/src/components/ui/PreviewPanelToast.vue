<script setup lang="ts">
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'

interface PreviewPanelToastProps {
  message: string
  visible: boolean
  /** Auto-dismiss progress bar duration; omit to hide the bar. */
  durationMs?: number
}

defineProps<PreviewPanelToastProps>()
</script>

<template>
  <Transition name="preview-panel-toast">
    <div
      v-if="visible"
      class="preview-panel-toast pointer-events-none absolute top-0 right-0 z-50 flex w-full max-w-[360px] items-start gap-3 overflow-hidden rounded-[14px] border border-[#EDEDF2] bg-white p-4 shadow-[0px_10px_24px_rgba(15,23,42,0.12)]"
      role="status"
      aria-live="polite"
    >
      <div
        class="preview-panel-toast__icon flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F3EDFF]"
        aria-hidden="true"
      >
        <InfoCircleFilledIcon class="size-6 text-[#6F4BD8]" />
      </div>

      <p class="preview-panel-toast__message flex-1 pt-0.5 text-sm font-medium leading-5 text-[#14141A]">
        {{ message }}
      </p>

      <div
        v-if="durationMs"
        class="preview-panel-toast__progress absolute bottom-0 left-0 h-[3px] bg-[#6F4BD8]/55"
        :style="{ animationDuration: `${durationMs}ms` }"
        aria-hidden="true"
      />
    </div>
  </Transition>
</template>

<style scoped>
.preview-panel-toast-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.21, 1.02, 0.73, 1),
    transform 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.preview-panel-toast-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.06, 0.71, 0.55, 1),
    transform 0.2s cubic-bezier(0.06, 0.71, 0.55, 1);
}

.preview-panel-toast-enter-from,
.preview-panel-toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

.preview-panel-toast__progress {
  animation-name: preview-panel-toast-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes preview-panel-toast-progress {
  from {
    width: 100%;
  }

  to {
    width: 0%;
  }
}
</style>
