<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ComponentType } from '@brand-constructor/shared'
import { useAuthStore } from '@/stores/auth'
import { useApiList, apiPost } from '@/composables/useApi'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('component_types'))

interface ComponentTypeWithCount extends ComponentType {
  variant_count: number
}

const {
  data: types,
  loading,
  fetchData: fetchTypes,
} = useApiList<ComponentTypeWithCount>('/api/components/types')
const showCreateModal = ref(false)
const creating = ref(false)
const newName = ref('')
const newDescription = ref('')

async function handleCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await apiPost('/api/components/types', {
      name: newName.value.trim(),
      description: newDescription.value.trim(),
    })
    newName.value = ''
    newDescription.value = ''
    showCreateModal.value = false
    fetchTypes()
  } finally {
    creating.value = false
  }
}

onMounted(fetchTypes)
</script>

<template>
  <div class="components-view">
    <div class="components-view__toolbar">
      <span class="components-view__count">{{ types.length }} component types</span>
      <BaseButton v-if="canWrite" @click="showCreateModal = true">+ New Component Type</BaseButton>
    </div>

    <div v-if="loading" class="components-view__loading">Loading...</div>

    <div v-else-if="types.length === 0" class="components-view__empty">
      No component types found. Create your first component type to get started.
    </div>

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

    <BaseModal
      v-if="showCreateModal"
      title="Create Component Type"
      @close="showCreateModal = false"
    >
      <form class="components-view__form" @submit.prevent="handleCreate">
        <BaseInput
          v-model="newName"
          label="Name"
          placeholder="e.g. Banners, Header, Tabbar..."
          required
        />
        <BaseTextarea
          v-model="newDescription"
          label="Description"
          placeholder="Brief description of this component type..."
          :rows="3"
        />
        <div class="components-view__form-actions">
          <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
          <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate">
            Create
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.components-view {
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-6;

    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-3;
    }
  }

  &__count {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__loading,
  &__empty {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: $spacing-4;

    @include mobile {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__form-actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-2;
    margin-top: $spacing-2;
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
