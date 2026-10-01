<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Concept } from '@brand-constructor/shared'
import { useApiList, apiDelete, getAssetUrl } from '@/composables/useApi'
import { describeApiError } from '@/utils/apiErrorText'
import { useListPolling } from '@/composables/useListPolling'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import { pinLeavingCard, useDeleteAnimation } from '@/composables/useDeleteAnimation'
import { forBriefLabel } from '@/utils/orderBriefs'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConceptCreateModal from '@/components/library/ConceptCreateModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('concepts'))
const statusFilter = ref<'all' | 'active' | 'used'>('all')

type ConceptWithAuthor = Concept & { author_name: string; brand_name: string | null }
const { data: concepts, loading, total, fetchData } = useApiList<ConceptWithAuthor>('/api/concepts')

const { sortedData: sortedConcepts, setSort: setConceptSort } = useTableSort(
  concepts,
  'created_at',
  'desc'
)
const conceptSortOption = ref('created_at:desc')

function onConceptSortChange(value: string) {
  conceptSortOption.value = value
  const [field, dir] = value.split(':') as [string, 'asc' | 'desc']
  setConceptSort(field, dir)
}

const showCreateModal = ref(false)

function refreshConcepts(options?: { silent?: boolean }) {
  // No page switcher: ask for the server's maximum (100), not the default 20.
  // `include_reserved`: the Admin also lists what was made for a brief's order.
  fetchData({
    queryParams: { status: statusFilter.value, per_page: '100', include_reserved: '1' },
    silent: options?.silent,
  })
}

onMounted(() => {
  refreshConcepts()
})

watch(statusFilter, () => refreshConcepts())

function openCreateModal() {
  showCreateModal.value = true
}

function onConceptCreated(concept: Concept) {
  showCreateModal.value = false
  router.push(`/concepts/${concept.id}`)
}

const showDeleteConfirm = ref(false)
const deleteTargetId = ref('')
const deleteTargetName = ref('')

const pollingPaused = computed(() => showCreateModal.value || showDeleteConfirm.value)
useListPolling(() => refreshConcepts({ silent: true }), { paused: pollingPaused })

function handleDelete(id: string, name: string) {
  deleteTargetId.value = id
  deleteTargetName.value = name
  showDeleteConfirm.value = true
}

const deleteError = ref<string | null>(null)

const { transitionName, playDelete } = useDeleteAnimation()

async function confirmDelete() {
  deleteError.value = null
  try {
    const id = deleteTargetId.value
    await apiDelete(`/api/concepts/${id}`)
    showDeleteConfirm.value = false
    // In place + quiet refresh — see BrandsView `confirmDeleteBrand`.
    playDelete(() => {
      concepts.value = concepts.value.filter(c => c.id !== id)
      total.value = Math.max(0, total.value - 1)
    }, () => refreshConcepts({ silent: true }))
  } catch (e) {
    const text = describeApiError(e, 'delete')
    deleteError.value = `${text.title}. ${text.body}`
  }
}
</script>

<template>
  <div class="concepts-view">
    <div class="concepts-view__status-tabs">
      <button
        class="concepts-view__status-tab"
        :class="{ 'concepts-view__status-tab--active': statusFilter === 'all' }"
        @click="statusFilter = 'all'"
      >
        All
      </button>
      <button
        class="concepts-view__status-tab"
        :class="{ 'concepts-view__status-tab--active': statusFilter === 'active' }"
        @click="statusFilter = 'active'"
      >
        Available
      </button>
      <button
        class="concepts-view__status-tab"
        :class="{ 'concepts-view__status-tab--active': statusFilter === 'used' }"
        @click="statusFilter = 'used'"
      >
        Used
      </button>
    </div>

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

    <TransitionGroup
      v-else
      tag="div"
      class="concepts-view__grid list-delete-cards"
      :name="transitionName"
      @before-leave="pinLeavingCard"
    >
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
          <div class="concept-card__header-row">
            <h3 class="concept-card__name">{{ concept.name }}</h3>
            <span
              v-if="concept.status === 'used'"
              class="concept-card__usage-badge concept-card__usage-badge--used"
              >Used in {{ concept.brand_name || '—' }}</span
            >
            <span
              v-else-if="forBriefLabel(concept)"
              class="concept-card__usage-badge concept-card__usage-badge--for-brief"
              >{{ forBriefLabel(concept) }}</span
            >
          </div>
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
    </TransitionGroup>

    <BaseModal
      v-if="showDeleteConfirm"
      title="Delete Concept"
      width="420px"
      @close="showDeleteConfirm = false"
    >
      <p class="concepts-view__confirm-text">
        Are you sure you want to delete <strong>"{{ deleteTargetName }}"</strong>? This action
        cannot be undone.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteConfirm = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="confirmDelete">Delete</BaseButton>
      </template>
    </BaseModal>

    <ConceptCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onConceptCreated"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.concepts-view {
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
    position: relative; // the leaving card is pinned inside it
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-6;

    @include mobile {
      grid-template-columns: 1fr;
      gap: $spacing-4;
    }
  }

  &__confirm-text {
    font-size: $font-size-sm;
    color: $color-text;
    line-height: $line-height-normal;
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

  &__header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-2;
    margin-bottom: $spacing-2;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
  }

  &__usage-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px $spacing-2;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    white-space: nowrap;
    flex-shrink: 0;

    &--used {
      background-color: #e2e3e5;
      color: #383d41;
    }

    // Made for a brief's order and reserved for it (phase 2a); the Admin's
    // primary family, so it reads apart from the grey «Used in».
    &--for-brief {
      background-color: $color-primary-light;
      color: $color-primary-hover;
    }
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
