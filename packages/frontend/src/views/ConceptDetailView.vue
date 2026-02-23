<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Concept, ExternalNaming, Asset } from '@brand-constructor/shared';
import { useApi, apiPut, apiUpload } from '@/composables/useApi';
import { useAuthStore } from '@/stores/auth';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

interface ConceptDetail extends Concept {
  namings: ExternalNaming[];
  assets: Asset[];
  author_name: string;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const canWrite = authStore.canWriteLibrary('concepts');

const { data: concept, loading, fetchData } = useApi<ConceptDetail>(
  `/api/concepts/${route.params.id}`
);

const isEditing = ref(false);
const editName = ref('');
const editDescription = ref('');
const uploading = ref(false);

onMounted(() => fetchData());

function startEditing() {
  if (!concept.value) return;
  editName.value = concept.value.name;
  editDescription.value = concept.value.description;
  isEditing.value = true;
}

async function saveChanges() {
  if (!concept.value || !editName.value.trim()) return;
  await apiPut(`/api/concepts/${concept.value.id}`, {
    name: editName.value.trim(),
    description: editDescription.value.trim(),
  });
  isEditing.value = false;
  fetchData();
}

async function handleFileUpload(event: Event, entityType: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !concept.value) return;

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    formData.append('entity_id', concept.value.id);

    await apiUpload<Asset>('/api/assets/upload', formData);
    fetchData();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    uploading.value = false;
    input.value = '';
  }
}
</script>

<template>
  <div class="concept-detail">
    <div class="concept-detail__back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/concepts')">
        &larr; Back to Concepts
      </BaseButton>
    </div>

    <div v-if="loading" class="concept-detail__loading">Loading...</div>

    <template v-else-if="concept">
      <div class="concept-detail__header">
        <div>
          <div class="concept-detail__title-row">
            <h2 v-if="!isEditing">{{ concept.name }}</h2>
            <BaseInput v-else v-model="editName" placeholder="Concept name" />
            <StatusBadge :status="concept.status" />
          </div>
          <p class="concept-detail__meta">
            Created by {{ concept.author_name }} on {{ new Date(concept.created_at).toLocaleDateString() }}
          </p>
        </div>
        <div v-if="canWrite" class="concept-detail__actions">
          <template v-if="isEditing">
            <BaseButton variant="secondary" @click="isEditing = false">Cancel</BaseButton>
            <BaseButton @click="saveChanges">Save</BaseButton>
          </template>
          <BaseButton v-else variant="secondary" @click="startEditing">Edit</BaseButton>
        </div>
      </div>

      <div class="concept-detail__section">
        <h3>Description</h3>
        <BaseTextarea v-if="isEditing" v-model="editDescription" :rows="4" />
        <p v-else class="concept-detail__text">{{ concept.description || 'No description provided.' }}</p>
      </div>

      <div class="concept-detail__section">
        <h3>Visual Assets</h3>
        <div class="concept-detail__assets">
          <div class="asset-slot">
            <span class="asset-slot__label">Visual (16:9)</span>
            <div class="asset-slot__preview">
              <img v-if="concept.visual_url" :src="concept.visual_url" alt="Visual" />
              <span v-else>No visual uploaded</span>
            </div>
            <input
              v-if="canWrite"
              type="file"
              accept="image/png,image/svg+xml"
              :disabled="uploading"
              @change="(e) => handleFileUpload(e, 'concept_visual')"
            />
          </div>
          <div class="asset-slot">
            <span class="asset-slot__label">Logo (1:1)</span>
            <div class="asset-slot__preview asset-slot__preview--square">
              <img v-if="concept.logo_url" :src="concept.logo_url" alt="Logo" />
              <span v-else>No logo uploaded</span>
            </div>
            <input
              v-if="canWrite"
              type="file"
              accept="image/png,image/svg+xml"
              :disabled="uploading"
              @change="(e) => handleFileUpload(e, 'concept_logo')"
            />
          </div>
        </div>
      </div>

      <div class="concept-detail__section">
        <h3>Linked External Namings ({{ concept.namings.length }})</h3>
        <div v-if="concept.namings.length === 0" class="concept-detail__empty">
          No namings linked to this concept yet.
        </div>
        <div v-else class="concept-detail__namings">
          <div v-for="naming in concept.namings" :key="naming.id" class="naming-chip">
            {{ naming.name }}
            <StatusBadge :status="naming.status" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.concept-detail {
  max-width: 900px;

  &__back {
    margin-bottom: $spacing-4;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: $spacing-6;
    padding: $spacing-6;
    background-color: $color-bg-white;
    border-radius: $radius-lg;
    border: 1px solid $color-border;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__meta {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-top: $spacing-1;
  }

  &__actions {
    display: flex;
    gap: $spacing-2;
  }

  &__section {
    padding: $spacing-6;
    background-color: $color-bg-white;
    border-radius: $radius-lg;
    border: 1px solid $color-border;
    margin-bottom: $spacing-4;

    h3 {
      margin-bottom: $spacing-4;
      font-size: $font-size-base;
    }
  }

  &__text {
    color: $color-text-secondary;
    line-height: $line-height-normal;
  }

  &__assets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: $spacing-4;
  }

  &__empty {
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  &__namings {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }
}

.asset-slot {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
  }

  &__preview {
    aspect-ratio: 16 / 9;
    background-color: $color-bg;
    border: 1px dashed $color-border;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: $color-text-muted;
    font-size: $font-size-sm;

    &--square {
      aspect-ratio: 1;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.naming-chip {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background-color: $color-bg;
  border: 1px solid $color-border;
  border-radius: $radius-full;
  font-size: $font-size-sm;
}
</style>
