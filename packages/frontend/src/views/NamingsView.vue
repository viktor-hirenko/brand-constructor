<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ExternalNaming, InternalNaming, Concept } from '@brand-constructor/shared'
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('external_namings'))

const activeTab = ref<'external' | 'internal'>('external')
const conceptFilter = ref<string>('all')

type ExternalNamingRow = ExternalNaming & { 
  concept_name: string | null
  author_name: string
}

const {
  data: externalNamings,
  loading: extLoading,
  total: extTotal,
  fetchData: fetchExternal,
} = useApiList<ExternalNamingRow>('/api/namings/external')

const {
  data: internalNamings,
  loading: intLoading,
  total: intTotal,
  fetchData: fetchInternal,
} = useApiList<InternalNaming & { author_name: string }>('/api/namings/internal')

const { data: concepts, fetchData: fetchConcepts } = useApiList<Concept>('/api/concepts')

const sortedConcepts = computed(() =>
  [...concepts.value].sort((a, b) => a.name.localeCompare(b.name))
)

const {
  sortedData: sortedExternal,
  sortField: extSortField,
  sortDirection: extSortDir,
  toggleSort: toggleExtSort,
} = useTableSort(externalNamings, 'created_at', 'desc')

const {
  sortedData: sortedInternal,
  sortField: intSortField,
  sortDirection: intSortDir,
  toggleSort: toggleIntSort,
} = useTableSort(internalNamings, 'created_at', 'desc')

const showCreateModal = ref(false)
const showEditModal = ref(false)
const newName = ref('')
const newTagline = ref('')
const newDomain = ref('')
const newPrice = ref<number | null>(null)
const newAvailabilityStatus = ref<'available' | 'sold' | 'unknown'>('unknown')
const newConceptId = ref<string | null>(null)
const creating = ref(false)

const editId = ref('')
const editName = ref('')
const editTagline = ref('')
const editDomain = ref('')
const editPrice = ref<number | null>(null)
const editAvailabilityStatus = ref<'available' | 'sold' | 'unknown'>('unknown')
const editConceptId = ref<string | null>(null)
const saving = ref(false)

function refreshList() {
  const params: Record<string, string> = {}
  if (activeTab.value === 'external') {
    if (conceptFilter.value !== 'all') {
      params.filter = conceptFilter.value
    }
    fetchExternal(params)
  } else {
    fetchInternal(params)
  }
}

onMounted(() => {
  refreshList()
  fetchConcepts({ per_page: '100' })
})
watch([activeTab, conceptFilter], refreshList)

function openCreateModal() {
  newName.value = ''
  newTagline.value = ''
  newDomain.value = ''
  newPrice.value = null
  newAvailabilityStatus.value = 'unknown'
  newConceptId.value = null
  fetchConcepts({ per_page: '100' })
  showCreateModal.value = true
}

async function handleCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    if (activeTab.value === 'external') {
      await apiPost('/api/namings/external', {
        name: newName.value.trim(),
        tagline: newTagline.value.trim(),
        domain: newDomain.value.trim() || null,
        price: newPrice.value,
        availability_status: newAvailabilityStatus.value,
        concept_id: newConceptId.value || null,
      })
    } else {
      await apiPost('/api/namings/internal', {
        name: newName.value.trim(),
        tagline: newTagline.value.trim(),
      })
    }
    showCreateModal.value = false
    refreshList()
  } finally {
    creating.value = false
  }
}

type InternalNamingRow = InternalNaming & { author_name: string }

function openEditModal(naming: ExternalNamingRow | InternalNamingRow) {
  editId.value = naming.id
  editName.value = naming.name
  editTagline.value = naming.tagline || ''
  if ('concept_id' in naming) {
    const extNaming = naming as ExternalNamingRow
    editConceptId.value = extNaming.concept_id
    editDomain.value = extNaming.domain || ''
    editPrice.value = extNaming.price ?? null
    editAvailabilityStatus.value = extNaming.availability_status || 'unknown'
  } else {
    editConceptId.value = null
    editDomain.value = ''
    editPrice.value = null
    editAvailabilityStatus.value = 'unknown'
  }
  fetchConcepts({ per_page: '100' })
  showEditModal.value = true
}

async function handleSaveEdit() {
  if (!editName.value.trim()) return
  saving.value = true
  try {
    const type = activeTab.value
    const body: Record<string, unknown> = {
      name: editName.value.trim(),
      tagline: editTagline.value.trim(),
    }
    if (type === 'external') {
      body.concept_id = editConceptId.value || null
      body.domain = editDomain.value.trim() || null
      body.price = editPrice.value
      body.availability_status = editAvailabilityStatus.value
    }
    await apiPut(`/api/namings/${type}/${editId.value}`, body)
    showEditModal.value = false
    refreshList()
  } finally {
    saving.value = false
  }
}

async function handleDeleteNaming(id: string, name: string) {
  if (!confirm(`Delete naming "${name}"?`)) return
  const type = activeTab.value
  await apiDelete(`/api/namings/${type}/${id}`)
  refreshList()
}
</script>

<template>
  <div class="namings-view">
    <div class="namings-view__tabs">
      <button
        class="namings-view__tab"
        :class="{ 'namings-view__tab--active': activeTab === 'external' }"
        @click="activeTab = 'external'"
      >
        External Namings
      </button>
      <button
        class="namings-view__tab"
        :class="{ 'namings-view__tab--active': activeTab === 'internal' }"
        @click="activeTab = 'internal'"
      >
        Internal Namings
      </button>
    </div>

    <div class="namings-view__toolbar">
      <div class="namings-view__filters">
        <select
          v-if="activeTab === 'external'"
          v-model="conceptFilter"
          class="namings-view__select"
        >
          <option value="all">All namings</option>
          <option value="linked">Linked to concept</option>
          <option value="standalone">Standalone</option>
        </select>
        <span class="namings-view__count">
          {{ activeTab === 'external' ? extTotal : intTotal }} namings
        </span>
      </div>
      <BaseButton v-if="canWrite" @click="openCreateModal"> + New Naming </BaseButton>
    </div>

    <div v-if="activeTab === 'external' ? extLoading : intLoading" class="namings-view__loading">
      Loading...
    </div>

    <div v-else class="namings-view__table-wrap">
      <table class="namings-view__table">
        <thead>
          <template v-if="activeTab === 'external'">
            <tr>
              <th class="sortable-th" @click="toggleExtSort('name')">
                Name
                <span v-if="extSortField === 'name'" class="sort-arrow">{{ extSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('domain')">
                Domain
                <span v-if="extSortField === 'domain'" class="sort-arrow">{{ extSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('price')">
                Price
                <span v-if="extSortField === 'price'" class="sort-arrow">{{ extSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th>Status</th>
              <th class="sortable-th" @click="toggleExtSort('concept_name')">
                Linked Concept
                <span v-if="extSortField === 'concept_name'" class="sort-arrow">{{ extSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('author_name')">
                Author
                <span v-if="extSortField === 'author_name'" class="sort-arrow">{{ extSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('created_at')">
                Created
                <span v-if="extSortField === 'created_at'" class="sort-arrow">{{ extSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th v-if="canWrite">Actions</th>
            </tr>
          </template>
          <template v-else>
            <tr>
              <th class="sortable-th" @click="toggleIntSort('name')">
                Name
                <span v-if="intSortField === 'name'" class="sort-arrow">{{ intSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th class="sortable-th" @click="toggleIntSort('author_name')">
                Author
                <span v-if="intSortField === 'author_name'" class="sort-arrow">{{ intSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th class="sortable-th" @click="toggleIntSort('created_at')">
                Created
                <span v-if="intSortField === 'created_at'" class="sort-arrow">{{ intSortDir === 'asc' ? '\u2191' : '\u2193' }}</span>
              </th>
              <th v-if="canWrite">Actions</th>
            </tr>
          </template>
        </thead>
        <tbody>
          <template v-if="activeTab === 'external'">
            <tr v-for="n in sortedExternal" :key="n.id">
              <td>
                <div class="namings-view__name-cell">
                  <span class="namings-view__name">{{ n.name }}</span>
                  <span v-if="n.tagline" class="namings-view__tagline">{{ n.tagline }}</span>
                </div>
              </td>
              <td>{{ n.domain || '—' }}</td>
              <td>{{ n.price != null ? `$${n.price}` : '—' }}</td>
              <td>
                <span 
                  class="namings-view__status-badge" 
                  :class="`namings-view__status-badge--${n.availability_status || 'unknown'}`"
                >
                  {{ n.availability_status === 'available' ? '✓ Available' : n.availability_status === 'sold' ? '✗ Sold' : '? Unknown' }}
                </span>
              </td>
              <td>{{ n.concept_name || '—' }}</td>
              <td>{{ n.author_name }}</td>
              <td>{{ new Date(n.created_at).toLocaleDateString() }}</td>
              <td v-if="canWrite" class="namings-view__actions">
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="secondary"
                  size="sm"
                  @click="openEditModal(n)"
                >
                  Edit
                </BaseButton>
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="danger"
                  size="sm"
                  @click="handleDeleteNaming(n.id, n.name)"
                >
                  Delete
                </BaseButton>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="n in sortedInternal" :key="n.id">
              <td>
                <div class="namings-view__name-cell">
                  <span class="namings-view__name">{{ n.name }}</span>
                  <span v-if="n.tagline" class="namings-view__tagline">{{ n.tagline }}</span>
                </div>
              </td>
              <td>{{ n.author_name }}</td>
              <td>{{ new Date(n.created_at).toLocaleDateString() }}</td>
              <td v-if="canWrite" class="namings-view__actions">
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="secondary"
                  size="sm"
                  @click="openEditModal(n)"
                >
                  Edit
                </BaseButton>
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="danger"
                  size="sm"
                  @click="handleDeleteNaming(n.id, n.name)"
                >
                  Delete
                </BaseButton>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <BaseModal
      v-if="showCreateModal"
      :title="`Create ${activeTab === 'external' ? 'External' : 'Internal'} Naming`"
      @close="showCreateModal = false"
    >
      <form class="namings-view__form" @submit.prevent="handleCreate">
        <BaseInput v-model="newName" label="Naming" placeholder="Enter naming..." required />
        <BaseInput v-model="newTagline" label="Tagline" placeholder="Short description..." />
        <template v-if="activeTab === 'external'">
          <BaseInput v-model="newDomain" label="Domain" placeholder="e.g. example.com" />
          <div class="namings-view__field">
            <label class="namings-view__label">Price ($)</label>
            <input 
              type="number" 
              v-model.number="newPrice" 
              class="namings-view__number-input"
              placeholder="e.g. 1500"
              min="0"
              step="0.01"
            />
          </div>
          <div class="namings-view__field">
            <label class="namings-view__label">Availability Status</label>
            <select v-model="newAvailabilityStatus" class="namings-view__select namings-view__select--full">
              <option value="unknown">Unknown</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div class="namings-view__field">
            <label class="namings-view__label">Link to Concept</label>
            <select v-model="newConceptId" class="namings-view__select namings-view__select--full">
              <option :value="null">— No concept —</option>
              <option v-for="c in sortedConcepts" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </template>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate">
          Create
        </BaseButton>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showEditModal"
      :title="`Edit ${activeTab === 'external' ? 'External' : 'Internal'} Naming`"
      @close="showEditModal = false"
    >
      <form class="namings-view__form" @submit.prevent="handleSaveEdit">
        <BaseInput v-model="editName" label="Naming" placeholder="Enter naming..." required />
        <BaseInput v-model="editTagline" label="Tagline" placeholder="Short description..." />
        <template v-if="activeTab === 'external'">
          <BaseInput v-model="editDomain" label="Domain" placeholder="e.g. example.com" />
          <div class="namings-view__field">
            <label class="namings-view__label">Price ($)</label>
            <input 
              type="number" 
              v-model.number="editPrice" 
              class="namings-view__number-input"
              placeholder="e.g. 1500"
              min="0"
              step="0.01"
            />
          </div>
          <div class="namings-view__field">
            <label class="namings-view__label">Availability Status</label>
            <select v-model="editAvailabilityStatus" class="namings-view__select namings-view__select--full">
              <option value="unknown">Unknown</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div class="namings-view__field">
            <label class="namings-view__label">Link to Concept</label>
            <select v-model="editConceptId" class="namings-view__select namings-view__select--full">
              <option :value="null">— No concept —</option>
              <option v-for="c in sortedConcepts" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </template>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancel</BaseButton>
        <BaseButton :loading="saving" :disabled="!editName.trim()" @click="handleSaveEdit">
          Save
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.namings-view {
  &__tabs {
    display: flex;
    gap: $spacing-1;
    margin-bottom: $spacing-6;
    border-bottom: 1px solid $color-border;
  }

  &__tab {
    padding: $spacing-3 $spacing-4;
    border: none;
    background: none;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: $color-text;
    }

    &--active {
      color: $color-primary;
      border-bottom-color: $color-primary;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-4;

    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-3;
    }
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: $spacing-3;

    @include mobile {
      flex-wrap: wrap;
    }
  }

  &__select {
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background-color: $color-bg-white;
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

  &__table-wrap {
    border: 1px solid $color-border;
    border-radius: $radius-lg;
    overflow: hidden;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  &__table {
    width: 100%;
    border-spacing: 0;

    @include mobile {
      min-width: 560px;
    }
    border-collapse: separate;
    background-color: $color-bg-white;

    th,
    td {
      padding: $spacing-3 $spacing-3;
      text-align: left;
      border-bottom: 1px solid $color-border;
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    th {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: $color-bg;

      &.sortable-th {
        cursor: pointer;
        user-select: none;
        transition: color $transition-fast;

        &:hover {
          color: $color-text;
        }
      }

      .sort-arrow {
        display: inline-block;
        margin-left: 2px;
        font-size: $font-size-xs;
        color: $color-primary;
      }
    }

    td {
      font-size: $font-size-sm;
      vertical-align: middle;
    }
  }

  &__name-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-weight: $font-weight-medium;
    line-height: 1.4;
  }

  &__tagline {
    font-size: $font-size-xs;
    color: $color-text-secondary;
    line-height: 1.3;
  }

  &__actions {
    white-space: nowrap;

    :deep(button) {
      margin-right: $spacing-2;

      &:last-child {
        margin-right: 0;
      }
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

  &__select--full {
    width: 100%;
  }

  &__number-input {
    width: 100%;
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background-color: $color-bg-white;

    &:focus {
      outline: none;
      border-color: $color-primary;
    }
  }

  &__status-badge {
    display: inline-flex;
    align-items: center;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    white-space: nowrap;

    &--available {
      background-color: #d4edda;
      color: #155724;
    }

    &--sold {
      background-color: #f8d7da;
      color: #721c24;
    }

    &--unknown {
      background-color: $color-bg;
      color: $color-text-muted;
    }
  }
}
</style>
