<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ComponentType, ComponentVariant } from '@brand-constructor/shared'
import { COMPONENT_TYPE_ASPECT_RATIOS, parseAspectRatio } from '@brand-constructor/shared'
import { apiGet, apiPost, apiDelete, apiUpload, getAssetUrl } from '@/composables/useApi'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('component_variants'))

const typeId = route.params.typeId as string
const componentType = ref<ComponentType | null>(null)
const variants = ref<(ComponentVariant & { author_name: string; brand_name: string | null })[]>([])
const loading = ref(false)
const statusFilter = ref<'all' | 'active'>('all')

const { sortedData: sortedVariants, setSort: setVariantSort } = useTableSort(
  variants,
  'created_at',
  'desc'
)
const variantSortOption = ref('created_at:desc')

function onVariantSortChange(value: string) {
  variantSortOption.value = value
  const [field, dir] = value.split(':') as [string, 'asc' | 'desc']
  setVariantSort(field, dir)
}

const showCreateModal = ref(false)
const newName = ref('')
const creating = ref(false)

const lightboxUrl = ref<string | null>(null)
const lightboxAlt = ref('')

function openVariantLightbox(thumbnailUrl: string, name: string) {
  lightboxUrl.value = getAssetUrl(thumbnailUrl)
  lightboxAlt.value = name
}

const deleteTarget = ref<{ id: string; name: string } | null>(null)
const deleting = ref(false)

const uploadingIds = ref<Set<string>>(new Set())
const uploadInputRefs = ref<Map<string, HTMLInputElement>>(new Map())

const configRatio = COMPONENT_TYPE_ASPECT_RATIOS[typeId]?.aspect_ratio
const aspectRatioInput = ref(configRatio ? String(configRatio) : '')

function setUploadRef(el: unknown, variantId: string) {
  if (el instanceof HTMLInputElement) {
    uploadInputRefs.value.set(variantId, el)
  }
}

function triggerUpload(variantId: string) {
  uploadInputRefs.value.get(variantId)?.click()
}

async function fetchVariants() {
  loading.value = true
  try {
    const result = await apiGet<{
      type: ComponentType
      variants: (ComponentVariant & { author_name: string; brand_name: string | null })[]
    }>(`/api/components/types/${typeId}/variants?status=${statusFilter.value}`)
    componentType.value = result.type
    variants.value = result.variants
  } catch (err) {
    console.error('Failed to fetch variants:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchVariants)
watch(statusFilter, fetchVariants)

async function handleCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await apiPost(`/api/components/types/${typeId}/variants`, { name: newName.value.trim() })
    showCreateModal.value = false
    newName.value = ''
    fetchVariants()
  } finally {
    creating.value = false
  }
}

function handleDelete(id: string, name: string) {
  deleteTarget.value = { id, name }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await apiDelete(`/api/components/variants/${deleteTarget.value.id}`)
    deleteTarget.value = null
    fetchVariants()
  } finally {
    deleting.value = false
  }
}

async function handleUploadThumbnail(event: Event, variantId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const parsedRatio = parseAspectRatio(aspectRatioInput.value)

  uploadingIds.value = new Set([...uploadingIds.value, variantId])
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', 'component_thumbnail')
    formData.append('entity_id', variantId)
    formData.append('component_type_id', typeId)
    if (parsedRatio !== null) {
      formData.append('aspect_ratio', String(parsedRatio))
    }
    await apiUpload('/api/assets/upload', formData)
    fetchVariants()
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Upload failed')
  } finally {
    input.value = ''
    uploadingIds.value = new Set([...uploadingIds.value].filter(id => id !== variantId))
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

    <div class="variants-view__status-tabs">
      <button
        class="variants-view__status-tab"
        :class="{ 'variants-view__status-tab--active': statusFilter === 'all' }"
        @click="statusFilter = 'all'"
      >
        All
      </button>
      <button
        class="variants-view__status-tab"
        :class="{ 'variants-view__status-tab--active': statusFilter === 'active' }"
        @click="statusFilter = 'active'"
      >
        Available
      </button>
    </div>

    <div v-if="componentType" class="variants-view__header">
      <div class="variants-view__header-left">
        <h2>{{ componentType.name }} Variants</h2>
        <select
          :value="variantSortOption"
          class="variants-view__sort-select"
          @change="onVariantSortChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="name:asc">Name A-Z</option>
          <option value="name:desc">Name Z-A</option>
        </select>
      </div>
      <BaseButton v-if="canWrite" @click="showCreateModal = true">+ New Variant</BaseButton>
    </div>

    <div v-if="canWrite && configRatio !== undefined" class="variants-view__ratio-field">
      <BaseInput
        v-model="aspectRatioInput"
        label="Співвідношення сторін"
        placeholder="напр. 1.9 або 16:9"
      />
      <span class="variants-view__ratio-hint">
        {{ aspectRatioInput ? 'Перевірка ±1% при завантаженні' : 'Без перевірки пропорцій' }}
      </span>
    </div>

    <div v-if="loading" class="variants-view__loading">Loading...</div>

    <div v-else class="variants-view__grid">
      <div v-for="v in sortedVariants" :key="v.id" class="variant-card">
        <div class="variant-card__preview">
          <img
            v-if="v.thumbnail_url"
            :src="getAssetUrl(v.thumbnail_url)"
            :alt="v.name"
            class="variant-card__img"
            @click="openVariantLightbox(v.thumbnail_url, v.name)"
          />
          <div v-else class="variant-card__placeholder">
            <svg
              class="variant-card__placeholder-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span class="variant-card__placeholder-text">No image yet</span>
          </div>
        </div>

        <input
          v-if="canWrite"
          :ref="el => setUploadRef(el, v.id)"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="variant-card__file-input"
          @change="e => handleUploadThumbnail(e, v.id)"
        />

        <div class="variant-card__body">
          <div class="variant-card__header-row">
            <h4 class="variant-card__name">{{ v.name }}</h4>
          </div>
          <div class="variant-card__meta">
            <span class="variant-card__author">by {{ v.author_name }}</span>
            <span class="variant-card__date">{{
              new Date(v.created_at).toLocaleDateString()
            }}</span>
          </div>
          <div v-if="canWrite" class="variant-card__actions">
            <BaseButton
              variant="secondary"
              :loading="uploadingIds.has(v.id)"
              @click="triggerUpload(v.id)"
            >
              {{ v.thumbnail_url ? 'Change image' : 'Upload image' }}
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="handleDelete(v.id, v.name)">
              Delete
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="lightboxUrl" class="lightbox" @click="lightboxUrl = null">
        <img :src="lightboxUrl" :alt="lightboxAlt" class="lightbox__img" />
      </div>
    </Teleport>

    <BaseModal v-if="showCreateModal" title="Create New Variant" @close="showCreateModal = false">
      <form @submit.prevent="handleCreate">
        <BaseInput
          v-model="newName"
          label="Variant Name"
          placeholder="e.g. Modern Gradient"
          required
        />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate"
          >Create</BaseButton
        >
      </template>
    </BaseModal>

    <BaseModal v-if="deleteTarget" title="Delete Variant" @close="deleteTarget = null">
      <p>Delete variant "{{ deleteTarget?.name }}"?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="deleteTarget = null">Cancel</BaseButton>
        <BaseButton variant="danger" :loading="deleting" @click="confirmDelete">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.variants-view {
  &__status-tabs {
    display: flex;
    gap: $spacing-2;
    margin-bottom: $spacing-4;
  }

  &__status-tab {
    padding: $spacing-1 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-bg;
      color: $color-text;
    }

    &--active {
      background: $color-primary;
      border-color: $color-primary;
      color: #fff;
    }
  }

  &__back {
    margin-bottom: $spacing-4;
  }

  &__header {
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

  &__header-left {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__sort-select {
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background-color: $color-bg-white;
  }

  &__ratio-field {
    max-width: 300px;
    margin-bottom: $spacing-4;
  }

  &__ratio-hint {
    display: block;
    margin-top: $spacing-1;
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: $spacing-4;

    @include mobile {
      grid-template-columns: 1fr;
    }
  }
}

.variant-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;

  &__preview {
    background-color: #e2e8f0;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
  }

  &__placeholder {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  &__placeholder-icon {
    width: 32px;
    height: 32px;
    color: $color-text-muted;
    opacity: 0.5;
  }

  &__placeholder-text {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__file-input {
    display: none;
  }

  &__body {
    padding: $spacing-4;
  }

  &__header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-2;
    margin-bottom: $spacing-1;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: $spacing-2;
  }

  &__author {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__img {
    cursor: zoom-in;
  }

  &__actions {
    margin-top: $spacing-3;
    display: flex;
    gap: $spacing-2;
  }
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;

  &__img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: $radius-md;
  }
}
</style>
