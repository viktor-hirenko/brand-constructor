<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { PrPackage } from '@brand-constructor/shared';
import { useAuthStore } from '@/stores/auth';
import { apiPost, apiPut, apiDelete } from '@/composables/useApi';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

const authStore = useAuthStore();
const canWrite = authStore.canWriteLibrary('pr_packages');

const packages = ref<PrPackage[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const editingPkg = ref<PrPackage | null>(null);

const form = ref({
  number: 0,
  name: '',
  description: '',
  teams_involved: '',
  goals: '',
  components_list: '',
  timeline: '',
  expenses: '',
});

async function fetchPackages() {
  loading.value = true;
  try {
    const res = await fetch('/api/pr-packages');
    const json = await res.json();
    if (json.success) packages.value = json.data;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPackages);

function resetForm() {
  form.value = { number: 0, name: '', description: '', teams_involved: '', goals: '', components_list: '', timeline: '', expenses: '' };
}

function openEdit(pkg: PrPackage) {
  editingPkg.value = pkg;
  form.value = {
    number: pkg.number,
    name: pkg.name,
    description: pkg.description,
    teams_involved: pkg.teams_involved,
    goals: pkg.goals,
    components_list: pkg.components_list,
    timeline: pkg.timeline,
    expenses: pkg.expenses,
  };
  showCreateModal.value = true;
}

async function handleSave() {
  if (!form.value.name.trim()) return;
  if (editingPkg.value) {
    await apiPut(`/api/pr-packages/${editingPkg.value.id}`, form.value);
  } else {
    await apiPost('/api/pr-packages', form.value);
  }
  showCreateModal.value = false;
  editingPkg.value = null;
  resetForm();
  fetchPackages();
}

function openCreate() {
  editingPkg.value = null;
  resetForm();
  form.value.number = packages.value.length;
  showCreateModal.value = true;
}

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete PR package "${name}"?`)) return;
  await apiDelete(`/api/pr-packages/${id}`);
  fetchPackages();
}
</script>

<template>
  <div class="pr-packages-view">
    <div class="pr-packages-view__toolbar">
      <span class="pr-packages-view__count">{{ packages.length }} packages</span>
      <BaseButton v-if="canWrite" @click="openCreate">+ New Package</BaseButton>
    </div>

    <div v-if="loading" class="pr-packages-view__loading">Loading...</div>

    <div v-else class="pr-packages-view__grid">
      <div v-for="pkg in packages" :key="pkg.id" class="package-card">
        <div class="package-card__header">
          <span class="package-card__number">#{{ pkg.number }}</span>
          <h3 class="package-card__name">{{ pkg.name }}</h3>
        </div>
        <div class="package-card__body">
          <div v-if="pkg.teams_involved" class="package-card__field">
            <span class="package-card__label">Teams</span>
            <p>{{ pkg.teams_involved }}</p>
          </div>
          <div v-if="pkg.description" class="package-card__field">
            <span class="package-card__label">Description</span>
            <p>{{ pkg.description }}</p>
          </div>
          <div v-if="pkg.timeline" class="package-card__field">
            <span class="package-card__label">Timeline</span>
            <p>{{ pkg.timeline }}</p>
          </div>
        </div>
        <div v-if="canWrite" class="package-card__actions">
          <BaseButton variant="secondary" size="sm" @click="openEdit(pkg)">Edit</BaseButton>
          <BaseButton variant="danger" size="sm" @click="handleDelete(pkg.id, pkg.name)">Delete</BaseButton>
        </div>
      </div>
    </div>

    <BaseModal
      v-if="showCreateModal"
      :title="editingPkg ? 'Edit PR Package' : 'Create PR Package'"
      width="680px"
      @close="showCreateModal = false"
    >
      <form class="pr-packages-view__form" @submit.prevent="handleSave">
        <div class="pr-packages-view__form-row">
          <BaseInput
            v-model.number="form.number"
            label="Package Number"
            type="number"
            required
          />
          <BaseInput
            v-model="form.name"
            label="Package Name"
            placeholder="e.g. Reputation Full"
            required
          />
        </div>
        <BaseTextarea v-model="form.description" label="Description" :rows="3" />
        <BaseInput v-model="form.teams_involved" label="Teams Involved" />
        <BaseTextarea v-model="form.goals" label="Goals" :rows="3" />
        <BaseTextarea v-model="form.components_list" label="Package Components" :rows="3" />
        <BaseInput v-model="form.timeline" label="Timeline" placeholder="e.g. 0-6 months" />
        <BaseTextarea v-model="form.expenses" label="Expenses" :rows="2" />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton :disabled="!form.name.trim()" @click="handleSave">
          {{ editingPkg ? 'Save Changes' : 'Create Package' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
.pr-packages-view {
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

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: $spacing-4;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__form-row {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: $spacing-4;
  }
}

.package-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;

  &__header {
    padding: $spacing-4 $spacing-5;
    background-color: $color-primary-light;
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__number {
    font-size: $font-size-sm;
    font-weight: $font-weight-bold;
    color: $color-primary;
    background-color: $color-bg-white;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-sm;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
  }

  &__body {
    padding: $spacing-4 $spacing-5;
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
  }

  &__field {
    p {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      line-height: $line-height-normal;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  &__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__actions {
    padding: $spacing-3 $spacing-5;
    border-top: 1px solid $color-border;
    display: flex;
    gap: $spacing-2;
    justify-content: flex-end;
  }
}
</style>
