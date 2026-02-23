<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { ExternalNaming, InternalNaming, Concept } from '@brand-constructor/shared';
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi';
import { useAuthStore } from '@/stores/auth';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const authStore = useAuthStore();
const canWrite = authStore.canWriteLibrary('external_namings');

const activeTab = ref<'external' | 'internal'>('external');
const statusFilter = ref('active');
const conceptFilter = ref<string>('all');

const {
  data: externalNamings,
  loading: extLoading,
  total: extTotal,
  fetchData: fetchExternal,
} = useApiList<ExternalNaming & { concept_name: string | null; author_name: string }>('/api/namings/external');

const {
  data: internalNamings,
  loading: intLoading,
  total: intTotal,
  fetchData: fetchInternal,
} = useApiList<InternalNaming & { author_name: string }>('/api/namings/internal');

const showCreateModal = ref(false);
const newName = ref('');
const newConceptId = ref<string | null>(null);
const creating = ref(false);

function refreshList() {
  const params: Record<string, string> = { status: statusFilter.value };
  if (activeTab.value === 'external') {
    if (conceptFilter.value !== 'all') {
      params.filter = conceptFilter.value;
    }
    fetchExternal(params);
  } else {
    fetchInternal(params);
  }
}

onMounted(refreshList);
watch([activeTab, statusFilter, conceptFilter], refreshList);

async function handleCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    if (activeTab.value === 'external') {
      await apiPost('/api/namings/external', {
        name: newName.value.trim(),
        concept_id: newConceptId.value || null,
      });
    } else {
      await apiPost('/api/namings/internal', { name: newName.value.trim() });
    }
    showCreateModal.value = false;
    newName.value = '';
    newConceptId.value = null;
    refreshList();
  } finally {
    creating.value = false;
  }
}

async function handleDeleteNaming(id: string, name: string) {
  if (!confirm(`Delete naming "${name}"?`)) return;
  const type = activeTab.value;
  await apiDelete(`/api/namings/${type}/${id}`);
  refreshList();
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
        <select v-model="statusFilter" class="namings-view__select">
          <option value="active">Active</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
        </select>
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
      <BaseButton v-if="canWrite" @click="showCreateModal = true">
        + New Naming
      </BaseButton>
    </div>

    <div
      v-if="(activeTab === 'external' ? extLoading : intLoading)"
      class="namings-view__loading"
    >
      Loading...
    </div>

    <table v-else class="namings-view__table">
      <thead>
        <tr>
          <th>Name</th>
          <th v-if="activeTab === 'external'">Linked Concept</th>
          <th>Status</th>
          <th>Author</th>
          <th>Created</th>
          <th v-if="canWrite">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="activeTab === 'external'">
          <tr v-for="n in externalNamings" :key="n.id">
            <td class="namings-view__name">{{ n.name }}</td>
            <td>{{ n.concept_name || '—' }}</td>
            <td><StatusBadge :status="n.status" /></td>
            <td>{{ n.author_name }}</td>
            <td>{{ new Date(n.created_at).toLocaleDateString() }}</td>
            <td v-if="canWrite">
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
            <td class="namings-view__name">{{ n.name }}</td>
            <td><StatusBadge :status="n.status" /></td>
            <td>{{ n.author_name }}</td>
            <td>{{ new Date(n.created_at).toLocaleDateString() }}</td>
            <td v-if="canWrite">
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

    <BaseModal
      v-if="showCreateModal"
      :title="`Create ${activeTab === 'external' ? 'External' : 'Internal'} Naming`"
      @close="showCreateModal = false"
    >
      <form class="namings-view__form" @submit.prevent="handleCreate">
        <BaseInput
          v-model="newName"
          label="Naming"
          placeholder="Enter naming..."
          required
        />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate">
          Create
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

  &__table {
    width: 100%;
    border-collapse: collapse;
    background-color: $color-bg-white;
    border: 1px solid $color-border;
    border-radius: $radius-lg;

    th, td {
      padding: $spacing-3 $spacing-4;
      text-align: left;
      border-bottom: 1px solid $color-border;
    }

    th {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: $color-bg;
    }

    td {
      font-size: $font-size-sm;
    }
  }

  &__name {
    font-weight: $font-weight-medium;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }
}
</style>
