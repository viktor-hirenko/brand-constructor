<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

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

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal" :style="{ maxWidth: width }">
        <div class="modal__header">
          <h3 class="modal__title">{{ title }}</h3>
          <button class="modal__close" @click="emit('close')">&times;</button>
        </div>
        <div class="modal__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal__footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal-backdrop;
  padding: $spacing-6;
}

.modal {
  width: 100%;
  background-color: $color-bg-white;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  z-index: $z-modal;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-5 $spacing-6;
    border-bottom: 1px solid $color-border;
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
  }

  &__body {
    padding: $spacing-6;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
    padding: $spacing-4 $spacing-6;
    border-top: 1px solid $color-border;
  }
}
</style>
