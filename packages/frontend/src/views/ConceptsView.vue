<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Concept, ExternalNaming } from '@brand-constructor/shared'
import { useApiList, apiPost, apiDelete, getAssetUrl } from '@/composables/useApi'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('concepts'))

type ConceptWithAuthor = Concept & { author_name: string }
const { data: concepts, loading, total, fetchData } = useApiList<ConceptWithAuthor>('/api/concepts')

const { sortedData: sortedConcepts, setSort: setConceptSort } = useTableSort(concepts, 'created_at', 'desc')
const conceptSortOption = ref('created_at:desc')

function onConceptSortChange(value: string) {
  conceptSortOption.value = value
  const [field, dir] = value.split(':') as [string, 'asc' | 'desc']
  setConceptSort(field, dir)
}

type NamingRow = ExternalNaming & { author_name: string }
const { data: availableNamings, fetchData: fetchNamings } = useApiList<NamingRow>('/api/namings/external')

const showCreateModal = ref(false)
const newName = ref('')
const newDescription = ref('')
const selectedNamingIds = ref<string[]>([])
const creating = ref(false)

const unlinkedNamings = computed(() =>
  availableNamings.value
    .filter((n) => !n.concept_id)
    .sort((a, b) => a.name.localeCompare(b.name))
)

onMounted(() => {
  fetchData()
  fetchNamings({ per_page: '100', filter: 'standalone' })
})

function openCreateModal() {
  newName.value = ''
  newDescription.value = ''
  selectedNamingIds.value = []
  fetchNamings({ per_page: '100', filter: 'standalone' })
  showCreateModal.value = true
}

function toggleNaming(id: string) {
  const idx = selectedNamingIds.value.indexOf(id)
  if (idx === -1) {
    selectedNamingIds.value = [...selectedNamingIds.value, id]
  } else {
    selectedNamingIds.value = selectedNamingIds.value.filter((v) => v !== id)
  }
}

async function handleCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const payload: Record<string, unknown> = {
      name: newName.value.trim(),
      description: newDescription.value.trim(),
    }
    if (selectedNamingIds.value.length > 0) {
      payload.naming_ids = selectedNamingIds.value
    }
    const concept = await apiPost<Concept>('/api/concepts', payload)
    showCreateModal.value = false
    newName.value = ''
    newDescription.value = ''
    selectedNamingIds.value = []
    router.push(`/concepts/${concept.id}`)
  } finally {
    creating.value = false
  }
}

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete concept "${name}"? This action cannot be undone.`)) return
  await apiDelete(`/api/concepts/${id}`)
  fetchData()
}
</script>

<template>
  <div class="concepts-view">
    <div class="concepts-view__toolbar">
      <div class="concepts-view__toolbar-left">
        <span class="concepts-view__count">{{ total }} concepts</span>
        <select
          :value="conceptSortOption"
          class="concepts-view__sort-select"
          @change="onConceptSortChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="name:asc">Name A-Z</option>
          <option value="name:desc">Name Z-A</option>
        </select>
      </div>
      <BaseButton v-if="canWrite" @click="openCreateModal"> + New Concept </BaseButton>
    </div>

    <div v-if="loading" class="concepts-view__loading">Loading...</div>

    <div v-else-if="concepts.length === 0" class="concepts-view__empty">
      No concepts found. Create your first concept to get started.
    </div>

    <div v-else class="concepts-view__grid">
      <div
        v-for="concept in sortedConcepts"
        :key="concept.id"
        class="concept-card"
        @click="router.push(`/concepts/${concept.id}`)"
      >
        <div class="concept-card__image">
          <img
            v-if="concept.visual_url"
            :src="getAssetUrl(concept.visual_url)"
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
            <span class="concept-card__meta">
              <span class="concept-card__author">by {{ concept.author_name }}</span>
              <span class="concept-card__date">{{
                new Date(concept.created_at).toLocaleDateString()
              }}</span>
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

    <BaseModal v-if="showCreateModal" title="Create New Concept" @close="showCreateModal = false">
      <form class="concepts-view__form" @submit.prevent="handleCreate">
        <BaseInput v-model="newName" label="Concept Name" placeholder="e.g. WonderLand" required />
        <BaseTextarea
          v-model="newDescription"
          label="Description"
          placeholder="Theme, mood, visual direction..."
          :rows="4"
        />
        <div v-if="unlinkedNamings.length > 0" class="concepts-view__field">
          <label class="concepts-view__label">
            Link to Naming
            <span class="concepts-view__label-hint">(optional)</span>
          </label>
          <div class="concepts-view__naming-list">
            <label
              v-for="naming in unlinkedNamings"
              :key="naming.id"
              class="concepts-view__naming-option"
            >
              <input
                type="checkbox"
                :checked="selectedNamingIds.includes(naming.id)"
                @change="toggleNaming(naming.id)"
              />
              <span class="concepts-view__naming-name">{{ naming.name }}</span>
              <span v-if="naming.tagline" class="concepts-view__naming-tagline">
                {{ naming.tagline }}
              </span>
            </label>
          </div>
        </div>
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
@use '@/styles/mixins' as *;

.concepts-view {
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

  &__toolbar-left {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__count {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__sort-select {
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background-color: $color-bg-white;
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
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-6;

    @include mobile {
      grid-template-columns: 1fr;
      gap: $spacing-4;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text;
  }

  &__label-hint {
    font-weight: $font-weight-normal;
    color: $color-text-muted;
  }

  &__naming-list {
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    padding: $spacing-2;
  }

  &__naming-option {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2;
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: $font-size-sm;
    transition: background-color $transition-fast;

    &:hover {
      background-color: $color-bg;
    }

    input[type='checkbox'] {
      flex-shrink: 0;
    }
  }

  &__naming-name {
    font-weight: $font-weight-medium;
  }

  &__naming-tagline {
    color: $color-text-secondary;
    font-size: $font-size-xs;
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

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__author {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }
}
</style>
