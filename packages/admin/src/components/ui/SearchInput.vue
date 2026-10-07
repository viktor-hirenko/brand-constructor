<script setup lang="ts">
/**
 * The search field above a table or a grid: one look for every list of the
 * admin (owner, 07.10 — the lists had a column sort and nothing to find a
 * row by).
 */
defineProps<{
  placeholder: string
  id?: string
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    :id="id"
    v-model="model"
    type="search"
    class="search-input"
    :placeholder="placeholder"
    :aria-label="placeholder"
  />
</template>

<style lang="scss" scoped>
.search-input {
  width: 260px;
  max-width: 100%;
  padding: $spacing-2 $spacing-3;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  font-family: inherit;
  font-size: $font-size-sm;
  color: $color-text;
  background-color: $color-bg-white;

  &:focus {
    outline: none;
    border-color: $color-border-focus;
    box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
  }

  &::placeholder {
    color: $color-text-muted;
  }
}
</style>
