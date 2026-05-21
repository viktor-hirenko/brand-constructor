<script setup lang="ts">
interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

withDefaults(defineProps<InputProps>(), {
  type: 'text',
  placeholder: '',
  required: false,
});

const model = defineModel<string | number>({ default: '' });
</script>

<template>
  <div class="form-field">
    <label v-if="label" class="form-field__label">
      {{ label }}
      <span v-if="required" class="form-field__required">*</span>
    </label>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      class="form-field__input"
      :class="{ 'form-field__input--error': error }"
    />
    <span v-if="error" class="form-field__error">{{ error }}</span>
  </div>
</template>

<style lang="scss" scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text;
  }

  &__required {
    color: $color-danger;
  }

  &__input {
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    color: $color-text;
    background-color: $color-bg-white;
    transition: border-color $transition-fast;

    &:focus {
      outline: none;
      border-color: $color-border-focus;
      box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
    }

    &--error {
      border-color: $color-danger;
    }

    &::placeholder {
      color: $color-text-muted;
    }
  }

  &__error {
    font-size: $font-size-xs;
    color: $color-danger;
  }
}
</style>
