<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ComponentType, ComponentVariant, Asset } from '@brand-constructor/shared';
import { apiPost, apiDelete, apiUpload } from '@/composables/useApi';
import { useAuthStore } from '@/stores/auth';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const canWrite = authStore.canWriteLibrary('component_variants');

const typeId = route.params.typeId as string;
const componentType = ref<ComponentType | null>(null);
const variants = ref<(ComponentVariant & { author_name: string })[]>([]);
const loading = ref(false);

const showCreateModal = ref(false);
const newName = ref('');
const creating = ref(false);

async function fetchVariants() {
  loading.value = true;
  try {
    const res = await fetch(`/api/components/types/${typeId}/variants`);
    const json = await res.json();
    if (json.success) {
      componentType.value = json.data.type;
      variants.value = json.data.variants;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchVariants);

async function handleCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    await apiPost(`/api/components/types/${typeId}/variants`, { name: newName.value.trim() });
    showCreateModal.value = false;
    newName.value = '';
    fetchVariants();
  } finally {
    creating.value = false;
  }
}

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete variant "${name}"?`)) return;
  await apiDelete(`/api/components/variants/${id}`);
  fetchVariants();
}

async function handleUploadThumbnail(event: Event, variantId: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', 'component_thumbnail');
    formData.append('entity_id', variantId);
    await apiUpload('/api/assets/upload', formData);
    fetchVariants();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    input.value = '';
  }
}
</script>

<template>
  <div class="variants-view">
    <div class="variants-view__back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/components')">
        &larr; Back to Components
      </BaseButton>
    </div>

    <div v-if="componentType" class="variants-view__header">
      <h2>{{ componentType.name }} Variants</h2>
      <BaseButton v-if="canWrite" @click="showCreateModal = true">+ New Variant</BaseButton>
    </div>

    <div v-if="loading" class="variants-view__loading">Loading...</div>

    <div v-else class="variants-view__grid">
      <div v-for="v in variants" :key="v.id" class="variant-card">
        <div class="variant-card__preview">
          <img v-if="v.thumbnail_url" :src="v.thumbnail_url" :alt="v.name" />
          <div v-else class="variant-card__placeholder">
            <span>No thumbnail</span>
            <input
              v-if="canWrite"
              type="file"
              accept="image/png,image/svg+xml"
              @change="(e) => handleUploadThumbnail(e, v.id)"
            />
          </div>
        </div>
        <div class="variant-card__body">
          <div class="variant-card__header">
            <span class="variant-card__number">Type {{ v.variant_number }}</span>
            <StatusBadge :status="v.status" />
          </div>
          <h4 class="variant-card__name">{{ v.name }}</h4>
          <span class="variant-card__author">by {{ v.author_name }}</span>
          <div v-if="canWrite && !v.used_in_brand_id" class="variant-card__actions">
            <BaseButton variant="danger" size="sm" @click="handleDelete(v.id, v.name)">Delete</BaseButton>
          </div>
        </div>
      </div>
    </div>

    <BaseModal
      v-if="showCreateModal"
      title="Create New Variant"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="handleCreate">
        <BaseInput v-model="newName" label="Variant Name" placeholder="e.g. Modern Gradient" required />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate">Create</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
.variants-view {
  &__back {
    margin-bottom: $spacing-4;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-6;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-4;
  }
}

.variant-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;

  &__preview {
    aspect-ratio: 4 / 3;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  &__body {
    padding: $spacing-4;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-2;
  }

  &__number {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: $color-primary;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    margin-bottom: $spacing-1;
  }

  &__author {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__actions {
    margin-top: $spacing-3;
    display: flex;
    gap: $spacing-2;
  }
}
</style>
