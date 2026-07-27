<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const router = useRouter()

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
    'workspace-brand': 'Brand Wizard',
    'workspace-new': 'New Brand',
  }
  return titles[route.name as string] || 'Brand Constructor'
})

// On the embedded Wizard routes, show a "back to Brands" affordance since the
// Wizard fills the content area and has no Admin breadcrumb of its own.
const isWorkspace = computed(() => route.path.startsWith('/workspace'))

function goToBrands() {
  router.push({ name: 'brands' })
}
</script>

<template>
  <header class="app-header">
    <button class="app-header__burger" aria-label="Open menu" @click="emit('toggle-sidebar')">
      <span class="app-header__burger-line" />
      <span class="app-header__burger-line" />
      <span class="app-header__burger-line" />
    </button>
    <button
      v-if="isWorkspace"
      class="app-header__back"
      type="button"
      @click="goToBrands"
    >
      &larr; Brands
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

    @include sidebar-collapsed {
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

  &__back {
    flex-shrink: 0;
    padding: $spacing-2 $spacing-3;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-primary;
    background: none;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background-color: $color-bg;
      border-color: $color-primary;
    }
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
