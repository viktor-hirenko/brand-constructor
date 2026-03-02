<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Concept, ExternalNaming, Asset } from '@brand-constructor/shared'
import { parseAspectRatio } from '@brand-constructor/shared'
import { useApi, apiPut, apiUpload, getAssetUrl } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
interface ConceptDetail extends Concept {
  namings: ExternalNaming[]
  assets: Asset[]
  author_name: string
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('concepts'))

const {
  data: concept,
  loading,
  fetchData,
} = useApi<ConceptDetail>(`/api/concepts/${route.params.id}`)

const isEditing = ref(false)
const editName = ref('')
const editDescription = ref('')
const uploadingType = ref<string | null>(null)

const visualInputRef = ref<HTMLInputElement | null>(null)
const logoInputRef = ref<HTMLInputElement | null>(null)
const visualAspectRatio = ref('')
const logoAspectRatio = ref('')

onMounted(() => fetchData())

function startEditing() {
  if (!concept.value) return
  editName.value = concept.value.name
  editDescription.value = concept.value.description
  isEditing.value = true
}

async function saveChanges() {
  if (!concept.value || !editName.value.trim()) return
  await apiPut(`/api/concepts/${concept.value.id}`, {
    name: editName.value.trim(),
    description: editDescription.value.trim(),
  })
  isEditing.value = false
  fetchData()
}

async function handleFileUpload(event: Event, entityType: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !concept.value) return

  const ratioInput = entityType === 'concept_visual' ? visualAspectRatio.value : logoAspectRatio.value
  const parsedRatio = parseAspectRatio(ratioInput)

  uploadingType.value = entityType
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entityType)
    formData.append('entity_id', concept.value.id)
    if (parsedRatio !== null) {
      formData.append('aspect_ratio', String(parsedRatio))
    }

    await apiUpload<Asset>('/api/assets/upload', formData)
    fetchData()
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Upload failed')
  } finally {
    uploadingType.value = null
    input.value = ''
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
          </div>
          <p class="concept-detail__meta">
            by {{ concept.author_name }} · {{ new Date(concept.created_at).toLocaleDateString() }}
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
        <p v-else class="concept-detail__text">
          {{ concept.description || 'No description provided.' }}
        </p>
      </div>

      <div class="concept-detail__section">
        <h3>Visual Assets</h3>
        <div class="concept-detail__assets">
          <div class="asset-slot">
            <span class="asset-slot__label">Visual</span>
            <div class="asset-slot__preview">
              <img v-if="concept.visual_url" :src="getAssetUrl(concept.visual_url)" alt="Visual" />
              <span v-else class="asset-slot__empty-text">No visual uploaded</span>
            </div>
            <template v-if="canWrite">
              <BaseInput
                v-model="visualAspectRatio"
                label="Співвідношення сторін"
                placeholder="напр. 1.5 або 16:9"
                class="asset-slot__ratio-input"
              />
              <input
                ref="visualInputRef"
                type="file"
                accept="image/png,image/svg+xml"
                class="asset-slot__file-input"
                @change="e => handleFileUpload(e, 'concept_visual')"
              />
              <BaseButton
                variant="secondary"
                size="sm"
                :loading="uploadingType === 'concept_visual'"
                :disabled="uploadingType !== null"
                @click="visualInputRef?.click()"
              >
                {{ concept.visual_url ? 'Change image' : 'Upload image' }}
              </BaseButton>
            </template>
          </div>

          <div class="asset-slot">
            <span class="asset-slot__label">Logo</span>
            <div class="asset-slot__preview asset-slot__preview--square">
              <img v-if="concept.logo_url" :src="getAssetUrl(concept.logo_url)" alt="Logo" />
              <span v-else class="asset-slot__empty-text">No logo uploaded</span>
            </div>
            <template v-if="canWrite">
              <BaseInput
                v-model="logoAspectRatio"
                label="Співвідношення сторін"
                placeholder="напр. 1 або 1:1"
                class="asset-slot__ratio-input"
              />
              <input
                ref="logoInputRef"
                type="file"
                accept="image/png,image/svg+xml"
                class="asset-slot__file-input"
                @change="e => handleFileUpload(e, 'concept_logo')"
              />
              <BaseButton
                variant="secondary"
                size="sm"
                :loading="uploadingType === 'concept_logo'"
                :disabled="uploadingType !== null"
                @click="logoInputRef?.click()"
              >
                {{ concept.logo_url ? 'Change image' : 'Upload image' }}
              </BaseButton>
            </template>
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
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

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

    @include mobile {
      flex-direction: column;
      gap: $spacing-4;
      padding: $spacing-4;
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__meta {
    font-size: $font-size-xs;
    color: $color-text-muted;
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

    @include mobile {
      padding: $spacing-4;
    }

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

    @include mobile {
      grid-template-columns: 1fr;
    }
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
    aspect-ratio: 1;
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

  &__empty-text {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__ratio-input {
    margin-top: $spacing-1;
  }

  &__file-input {
    display: none;
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
