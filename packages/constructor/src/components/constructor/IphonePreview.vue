<script setup lang="ts">
import { useConstructorStore } from '@/stores/constructor';

const store = useConstructorStore();
</script>

<template>
  <div class="iphone-preview">
    <div class="iphone-preview__frame">
      <div class="iphone-preview__notch" />
      <div class="iphone-preview__screen">
        <div class="iphone-preview__content">
          <p class="iphone-preview__placeholder">
            Live Preview
          </p>
          <p class="iphone-preview__hint">
            Тут буде відображатися попередній перегляд вашого бренду
          </p>
        </div>
      </div>
      <div class="iphone-preview__home-indicator" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.iphone-preview {
  position: sticky;
  top: 100px;

  &__frame {
    width: 280px;
    height: 580px;
    background: $color-black;
    border-radius: 40px;
    padding: 12px;
    position: relative;
    box-shadow: $shadow-xl;
  }

  &__notch {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 28px;
    background: $color-black;
    border-radius: 0 0 16px 16px;
    z-index: 10;
  }

  &__screen {
    width: 100%;
    height: 100%;
    background: $color-white;
    border-radius: 32px;
    overflow: hidden;
    position: relative;
  }

  &__content {
    @include flex-center;
    @include flex-column;
    height: 100%;
    padding: $spacing-6;
    text-align: center;
    gap: $spacing-2;
  }

  &__placeholder {
    @include heading-3;
    color: $color-text-muted;
  }

  &__hint {
    @include small-text;
    color: $color-text-muted;
    max-width: 180px;
  }

  &__home-indicator {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 4px;
    background: $color-text-muted;
    border-radius: $radius-full;
  }
}
</style>
