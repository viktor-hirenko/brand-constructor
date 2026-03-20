<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    brands: 'Brands',
    concepts: 'Concepts Library',
    'concept-detail': 'Concept Details',
    namings: 'Namings Library',
    'pr-packages': 'PR Packages',
    'component-variants': 'Component Variants',
    components: 'UI Components Library',
    users: 'User Management',
  }
  return titles[route.name as string] || 'Brand Constructor'
})
</script>

<template>
  <header class="app-header">
    <button class="app-header__burger" aria-label="Open menu" @click="emit('toggle-sidebar')">
      <span class="app-header__burger-line" />
      <span class="app-header__burger-line" />
      <span class="app-header__burger-line" />
    </button>
    <h1 class="app-header__title">{{ pageTitle }}</h1>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use '@/styles/variables' as *;

.app-header {
  padding: $spacing-6;
  background-color: $color-bg-white;
  border-bottom: 1px solid $color-border;
  display: flex;
  align-items: center;
  gap: $spacing-4;

  @include mobile {
    padding: $spacing-4;
  }

  &__burger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: $spacing-1;
    flex-shrink: 0;

    @include mobile-tablet {
      display: flex;
    }
  }

  &__burger-line {
    display: block;
    width: 22px;
    height: 2px;
    background-color: $color-text;
    border-radius: 2px;
    transition: background-color $transition-fast;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $color-text;

    @include mobile {
      font-size: $font-size-xl;
    }
  }
}
</style>
