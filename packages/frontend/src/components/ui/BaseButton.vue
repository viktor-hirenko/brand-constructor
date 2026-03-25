<script setup lang="ts">
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
});
</script>

<template>
  <button
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
  >
    <span class="btn__label" :class="{ 'btn__label--hidden': loading }">
      <slot />
    </span>
    <span v-if="loading" class="btn__spinner-wrap" aria-hidden="true">
      <span class="btn__spinner" />
    </span>
  </button>
</template>

<style lang="scss" scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
  border: 1px solid transparent;
  border-radius: $radius-md;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background-color: $color-primary;
    color: $color-text-inverse;

    &:hover:not(:disabled) {
      background-color: $color-primary-hover;
    }
  }

  &--secondary {
    background-color: $color-bg-white;
    color: $color-text;
    border-color: $color-border;

    &:hover:not(:disabled) {
      background-color: $color-bg;
    }
  }

  &--danger {
    background-color: $color-danger;
    color: $color-text-inverse;

    &:hover:not(:disabled) {
      background-color: $color-danger-hover;
    }
  }

  &--ghost {
    background-color: transparent;
    color: $color-text-secondary;

    &:hover:not(:disabled) {
      background-color: $color-bg;
      color: $color-text;
    }
  }

  &--sm {
    padding: $spacing-1 $spacing-3;
    font-size: $font-size-xs;
  }

  &--md {
    padding: $spacing-2 $spacing-4;
    font-size: $font-size-sm;
  }

  &--lg {
    padding: $spacing-3 $spacing-6;
    font-size: $font-size-base;
  }

  &__label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: inherit;

    &--hidden {
      visibility: hidden;
    }
  }

  &__spinner-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  &__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
