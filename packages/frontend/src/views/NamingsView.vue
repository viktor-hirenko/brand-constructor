<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ExternalNaming, InternalNaming, Concept } from '@brand-constructor/shared'
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('external_namings'))

const activeTab = ref<'external' | 'internal'>('external')
const conceptFilter = ref<string>('all')

type ExternalNamingRow = ExternalNaming & { concept_name: string | null; author_name: string }

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

const showCreateModal = ref(false)
const showEditModal = ref(false)
const newName = ref('')
const newTagline = ref('')
const newConceptId = ref<string | null>(null)
const creating = ref(false)

const editId = ref('')
const editName = ref('')
const editTagline = ref('')
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
  newConceptId.value = null
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
  editConceptId.value = 'concept_id' in naming ? (naming as ExternalNamingRow).concept_id : null
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
          <tr>
            <th>Name</th>
            <th v-if="activeTab === 'external'">Linked Concept</th>
            <th>Author</th>
            <th>Created</th>
            <th v-if="canWrite">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="activeTab === 'external'">
            <tr v-for="n in externalNamings" :key="n.id">
              <td class="namings-view__name-cell">
                <span class="namings-view__name">{{ n.name }}</span>
                <span v-if="n.tagline" class="namings-view__tagline">{{ n.tagline }}</span>
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
            <tr v-for="n in internalNamings" :key="n.id">
              <td class="namings-view__name-cell">
                <span class="namings-view__name">{{ n.name }}</span>
                <span v-if="n.tagline" class="namings-view__tagline">{{ n.tagline }}</span>
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
        <div v-if="activeTab === 'external'" class="namings-view__field">
          <label class="namings-view__label">Link to Concept</label>
          <select v-model="newConceptId" class="namings-view__select namings-view__select--full">
            <option :value="null">— No concept —</option>
            <option v-for="c in concepts" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
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
        <div v-if="activeTab === 'external'" class="namings-view__field">
          <label class="namings-view__label">Link to Concept</label>
          <select v-model="editConceptId" class="namings-view__select namings-view__select--full">
            <option :value="null">— No concept —</option>
            <option v-for="c in concepts" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
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
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: $spacing-3;
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
  }

  &__table {
    width: 100%;
    border-spacing: 0;
    border-collapse: separate;
    background-color: $color-bg-white;

    th,
    td {
      padding: $spacing-2 $spacing-3;
      text-align: left;
      border-bottom: 1px solid $color-border;
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
      white-space: nowrap;
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
}
</style>
