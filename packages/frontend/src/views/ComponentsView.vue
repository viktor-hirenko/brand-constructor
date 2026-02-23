<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { ComponentType } from '@brand-constructor/shared';
import { useAuthStore } from '@/stores/auth';
import BaseButton from '@/components/ui/BaseButton.vue';

const router = useRouter();
const authStore = useAuthStore();
const canWrite = authStore.canWriteLibrary('component_types');

interface ComponentTypeWithCount extends ComponentType {
  variant_count: number;
}

const types = ref<ComponentTypeWithCount[]>([]);
const loading = ref(false);

async function fetchTypes() {
  loading.value = true;
  try {
    const res = await fetch('/api/components/types');
    const json = await res.json();
    if (json.success) types.value = json.data;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchTypes);
</script>

<template>
  <div class="components-view">
    <div class="components-view__toolbar">
      <span class="components-view__count">{{ types.length }} component types</span>
    </div>

    <div v-if="loading" class="components-view__loading">Loading...</div>

    <div v-else class="components-view__grid">
      <div
        v-for="type in types"
        :key="type.id"
        class="type-card"
        @click="router.push(`/components/${type.id}`)"
      >
        <div class="type-card__icon">&#9638;</div>
        <h3 class="type-card__name">{{ type.name }}</h3>
        <p class="type-card__description">{{ type.description || 'No description' }}</p>
        <span class="type-card__count">{{ type.variant_count }} variants</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.components-view {
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-6;
  }

  &__count {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $spacing-4;
  }
}

.type-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $spacing-6;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: center;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-primary;
  }

  &__icon {
    font-size: 2.5rem;
    margin-bottom: $spacing-3;
    color: $color-primary;
  }

  &__name {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    margin-bottom: $spacing-2;
  }

  &__description {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-bottom: $spacing-3;
  }

  &__count {
    font-size: $font-size-xs;
    color: $color-text-muted;
    background-color: $color-bg;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-full;
  }
}
</style>
