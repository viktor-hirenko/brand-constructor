<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

interface ModalProps {
  title: string;
  width?: string;
}

const props = withDefaults(defineProps<ModalProps>(), {
  width: '560px',
});

const emit = defineEmits<{
  close: [];
}>();

const isVisible = ref(false)

function handleClose() {
  isVisible.value = false
}

function onAfterLeave() {
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
  await nextTick()
  isVisible.value = true
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" @after-leave="onAfterLeave">
      <div
        v-if="isVisible"
        class="modal-backdrop"
        @click.self="handleClose"
      >
        <div class="modal" :style="{ maxWidth: width }">
          <div class="modal__header">
            <h3 class="modal__title">{{ title }}</h3>
            <button class="modal__close" @click="handleClose">&times;</button>
          </div>
          <div class="modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

// Desktop: backdrop fades, modal scales up
.modal-enter-active {
  transition: opacity 220ms ease;

  .modal {
    transition: opacity 220ms ease, transform 220ms ease;
  }
}

.modal-leave-active {
  transition: opacity 180ms ease;

  .modal {
    transition: opacity 180ms ease, transform 180ms ease;
  }
}

.modal-enter-from {
  opacity: 0;

  .modal {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
}

.modal-leave-to {
  opacity: 0;

  .modal {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
}

// Mobile: bottom sheet slides up
@include mobile {
  .modal-enter-from .modal {
    transform: translateY(100%);
    opacity: 1;
  }

  .modal-leave-to .modal {
    transform: translateY(100%);
    opacity: 1;
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal-backdrop;
  padding: $spacing-6;

  @include mobile {
    align-items: flex-end;
    padding: 0;
  }
}

.modal {
  width: 100%;
  background-color: $color-bg-white;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  z-index: $z-modal;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 3rem);

  @include mobile {
    max-height: 92dvh;
    border-radius: $radius-lg $radius-lg 0 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-5 $spacing-6;
    border-bottom: 1px solid $color-border;
    flex-shrink: 0;

    @include mobile {
      padding: $spacing-4;
    }
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
  }

  &__close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: $font-size-xl;
    color: $color-text-muted;
    border-radius: $radius-sm;

    &:hover {
      background-color: $color-bg;
      color: $color-text;
    }

    @include mobile {
      width: 40px;
      height: 40px;
      font-size: $font-size-2xl;
    }
  }

  &__body {
    padding: $spacing-6;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    flex: 1;

    @include mobile {
      padding: $spacing-4;
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
    padding: $spacing-4 $spacing-6;
    border-top: 1px solid $color-border;
    flex-shrink: 0;

    @include mobile {
      padding: $spacing-3 $spacing-4;
    }
  }
}
</style>
