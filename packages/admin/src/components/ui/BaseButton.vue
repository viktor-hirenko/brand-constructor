<script setup lang="ts">
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
})
</script>

<template>
  <button class="btn" :class="[`btn--${variant}`, `btn--${size}`]" :disabled="disabled || loading">
    <span class="btn__content" :class="{ 'btn__content--hidden': loading }">
      <slot />
    </span>
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
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
  line-height: $line-height-tight;
  cursor: pointer;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;
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
    min-height: 28px;
    padding: $spacing-1 $spacing-3;
    font-size: $font-size-xs;
  }

  &--md {
    min-height: 36px;
    padding: $spacing-2 $spacing-4;
    font-size: $font-size-sm;
  }

  &--lg {
    min-height: 44px;
    padding: $spacing-3 $spacing-6;
    font-size: $font-size-base;
  }

  &__content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: inherit;

    &--hidden {
      visibility: hidden;
    }
  }

  &__spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: btn-spin 0.6s linear infinite;
  }
}

@keyframes btn-spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
