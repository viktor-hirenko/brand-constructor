<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Concept } from '@brand-constructor/shared';
import { useApiList, apiPost, apiDelete } from '@/composables/useApi';
import { useAuthStore } from '@/stores/auth';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

const router = useRouter();
const authStore = useAuthStore();
const canWrite = authStore.canWriteLibrary('concepts');

const { data: concepts, loading, total, fetchData } = useApiList<Concept>('/api/concepts');

const showCreateModal = ref(false);
const newName = ref('');
const newDescription = ref('');
const creating = ref(false);

onMounted(() => fetchData());

async function handleCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const concept = await apiPost<Concept>('/api/concepts', {
      name: newName.value.trim(),
      description: newDescription.value.trim(),
    });
    showCreateModal.value = false;
    newName.value = '';
    newDescription.value = '';
    router.push(`/concepts/${concept.id}`);
  } finally {
    creating.value = false;
  }
}

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete concept "${name}"? This action cannot be undone.`)) return;
  await apiDelete(`/api/concepts/${id}`);
  fetchData();
}
</script>

<template>
  <div class="concepts-view">
    <div class="concepts-view__toolbar">
      <span class="concepts-view__count">{{ total }} concepts</span>
      <BaseButton v-if="canWrite" @click="showCreateModal = true">
        + New Concept
      </BaseButton>
    </div>

    <div v-if="loading" class="concepts-view__loading">Loading...</div>

    <div v-else-if="concepts.length === 0" class="concepts-view__empty">
      No concepts found. Create your first concept to get started.
    </div>

    <div v-else class="concepts-view__grid">
      <div
        v-for="concept in concepts"
        :key="concept.id"
        class="concept-card"
        @click="router.push(`/concepts/${concept.id}`)"
      >
        <div class="concept-card__image">
          <img
            v-if="concept.visual_url"
            :src="concept.visual_url"
            :alt="concept.name"
          />
          <div v-else class="concept-card__placeholder">No visual</div>
        </div>
        <div class="concept-card__body">
          <h3 class="concept-card__name">{{ concept.name }}</h3>
          <p class="concept-card__description">
            {{ concept.description || 'No description' }}
          </p>
          <div class="concept-card__footer">
            <span class="concept-card__date">
              {{ new Date(concept.created_at).toLocaleDateString() }}
            </span>
            <BaseButton
              v-if="canWrite && !concept.used_in_brand_id"
              variant="danger"
              size="sm"
              @click.stop="handleDelete(concept.id, concept.name)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <BaseModal
      v-if="showCreateModal"
      title="Create New Concept"
      @close="showCreateModal = false"
    >
      <form class="concepts-view__form" @submit.prevent="handleCreate">
        <BaseInput
          v-model="newName"
          label="Concept Name"
          placeholder="e.g. WonderLand"
          required
        />
        <BaseTextarea
          v-model="newDescription"
          label="Description"
          placeholder="Theme, mood, visual direction..."
          :rows="4"
        />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate">
          Create Concept
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
.concepts-view {
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

  &__loading,
  &__empty {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
    font-size: $font-size-lg;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: $spacing-6;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }
}

.concept-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-primary;
  }

  &__image {
    aspect-ratio: 1;
    background-color: $color-bg;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  &__body {
    padding: $spacing-4;
  }

  &__name {
    margin-bottom: $spacing-2;
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
  }

  &__description {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    line-height: $line-height-normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: $spacing-3;
  }

  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }
}
</style>
