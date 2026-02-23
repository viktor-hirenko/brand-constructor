<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    concepts: 'Concepts Library',
    'concept-detail': 'Concept Details',
    namings: 'Namings Library',
    'pr-packages': 'PR Packages',
    components: 'UI Components Library',
    'component-variants': 'Component Variants',
    users: 'User Management',
  };
  return titles[route.name as string] || 'Brand Constructor';
});
</script>

<template>
  <header class="app-header">
    <h1 class="app-header__title">{{ pageTitle }}</h1>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  padding: $spacing-6;
  background-color: $color-bg-white;
  border-bottom: 1px solid $color-border;

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $color-text;
  }
}
</style>
