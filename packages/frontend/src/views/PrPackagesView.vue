<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PrPackage } from '@brand-constructor/shared'
import { PR_TEAMS } from '@brand-constructor/shared'
import { useAuthStore } from '@/stores/auth'
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('pr_packages'))

const ALL_TEAMS = PR_TEAMS

type PrPackageWithAuthor = PrPackage & { author_name: string }
const {
  data: packages,
  loading,
  fetchData: fetchPackages,
} = useApiList<PrPackageWithAuthor>('/api/pr-packages')
const showCreateModal = ref(false)
const editingPkg = ref<PrPackage | null>(null)
const viewingPkg = ref<PrPackage | null>(null)

const deleteTarget = ref<{ id: string; name: string } | null>(null)
const deleting = ref(false)

const form = ref({
  number: 0,
  name: '',
  description: '',
  teams_involved: '',
  requirements: '',
  goals: '',
  components_list: '',
  timeline: '',
  expenses: '',
})

const selectedTeams = computed({
  get: () =>
    form.value.teams_involved
      ? form.value.teams_involved
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
      : [],
  set: (val: string[]) => {
    form.value.teams_involved = val.join(', ')
  },
})

function toggleTeam(team: string) {
  const current = selectedTeams.value
  if (current.includes(team)) {
    selectedTeams.value = current.filter(t => t !== team)
  } else {
    selectedTeams.value = [...current, team]
  }
}

function parseTeams(str: string): string[] {
  return str
    ? str
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : []
}

onMounted(fetchPackages)

function resetForm() {
  form.value = {
    number: 0,
    name: '',
    description: '',
    teams_involved: '',
    requirements: '',
    goals: '',
    components_list: '',
    timeline: '',
    expenses: '',
  }
}

function openEdit(pkg: PrPackage) {
  editingPkg.value = pkg
  form.value = {
    number: pkg.number,
    name: pkg.name,
    description: pkg.description,
    teams_involved: pkg.teams_involved,
    requirements: pkg.requirements,
    goals: pkg.goals,
    components_list: pkg.components_list,
    timeline: pkg.timeline,
    expenses: pkg.expenses,
  }
  showCreateModal.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) return
  try {
    if (editingPkg.value) {
      await apiPut(`/api/pr-packages/${editingPkg.value.id}`, form.value)
    } else {
      await apiPost('/api/pr-packages', form.value)
    }
    showCreateModal.value = false
    editingPkg.value = null
    resetForm()
    fetchPackages()
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to save package')
  }
}

function openCreate() {
  editingPkg.value = null
  resetForm()
  form.value.number = packages.value.length
  showCreateModal.value = true
}

function handleDelete(id: string, name: string) {
  deleteTarget.value = { id, name }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await apiDelete(`/api/pr-packages/${deleteTarget.value.id}`)
    deleteTarget.value = null
    fetchPackages()
  } finally {
    deleting.value = false
  }
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
      <div v-for="pkg in packages" :key="pkg.id" class="package-card" @click="viewingPkg = pkg">
        <div class="package-card__header">
          <span class="package-card__number">#{{ pkg.number }}</span>
          <h3 class="package-card__name">{{ pkg.name }}</h3>
        </div>
        <div class="package-card__body">
          <div v-if="pkg.teams_involved" class="package-card__field">
            <span class="package-card__label">Teams</span>
            <div class="team-chips team-chips--sm">
              <span
                v-for="team in parseTeams(pkg.teams_involved)"
                :key="team"
                class="team-chip team-chip--active"
                >{{ team }}</span
              >
            </div>
          </div>
          <div v-if="pkg.description" class="package-card__field">
            <span class="package-card__label">Description</span>
            <p class="package-card__clamp">{{ pkg.description }}</p>
          </div>
          <div v-if="pkg.timeline" class="package-card__field">
            <span class="package-card__label">Timeline</span>
            <p>{{ pkg.timeline }}</p>
          </div>
        </div>
        <div class="package-card__footer">
          <div class="package-card__meta">
            <span class="package-card__author">by {{ pkg.author_name }}</span>
            <span class="package-card__date">{{
              new Date(pkg.created_at).toLocaleDateString()
            }}</span>
          </div>
          <div v-if="canWrite" class="package-card__actions">
            <BaseButton variant="secondary" size="sm" @click.stop="openEdit(pkg)">Edit</BaseButton>
            <BaseButton variant="danger" size="sm" @click.stop="handleDelete(pkg.id, pkg.name)"
              >Delete</BaseButton
            >
          </div>
        </div>
      </div>
    </div>

    <BaseModal
      v-if="viewingPkg"
      :title="`#${viewingPkg.number} ${viewingPkg.name}`"
      width="680px"
      @close="viewingPkg = null"
    >
      <div class="package-view">
        <div v-if="viewingPkg.teams_involved" class="package-view__field">
          <span class="package-view__label">Teams Involved</span>
          <div class="team-chips">
            <span
              v-for="team in parseTeams(viewingPkg.teams_involved)"
              :key="team"
              class="team-chip team-chip--active"
              >{{ team }}</span
            >
          </div>
        </div>
        <div v-if="viewingPkg.description" class="package-view__field">
          <span class="package-view__label">Description</span>
          <p class="package-view__pre">{{ viewingPkg.description }}</p>
        </div>
        <div v-if="viewingPkg.requirements" class="package-view__field">
          <span class="package-view__label">Requirements</span>
          <p class="package-view__pre">{{ viewingPkg.requirements }}</p>
        </div>
        <div v-if="viewingPkg.goals" class="package-view__field">
          <span class="package-view__label">Goals</span>
          <p class="package-view__pre">{{ viewingPkg.goals }}</p>
        </div>
        <div v-if="viewingPkg.components_list" class="package-view__field">
          <span class="package-view__label">Package Components</span>
          <p class="package-view__pre">{{ viewingPkg.components_list }}</p>
        </div>
        <div v-if="viewingPkg.timeline" class="package-view__field">
          <span class="package-view__label">Timeline</span>
          <p>{{ viewingPkg.timeline }}</p>
        </div>
        <div v-if="viewingPkg.expenses" class="package-view__field">
          <span class="package-view__label">Expenses</span>
          <p class="package-view__pre">{{ viewingPkg.expenses }}</p>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="viewingPkg = null">Close</BaseButton>
        <BaseButton
          v-if="canWrite"
          @click="
            () => {
              const p = viewingPkg!
              viewingPkg = null
              openEdit(p)
            }
          "
          >Edit</BaseButton
        >
      </template>
    </BaseModal>

    <BaseModal
      v-if="showCreateModal"
      :title="editingPkg ? 'Edit PR Package' : 'Create PR Package'"
      width="680px"
      @close="showCreateModal = false"
    >
      <form class="pr-packages-view__form" @submit.prevent="handleSave">
        <div class="pr-packages-view__form-row">
          <BaseInput v-model.number="form.number" label="№" type="number" required />
          <BaseInput v-model="form.name" label="Name" placeholder="e.g. Reputation Full" required />
        </div>
        <BaseTextarea v-model="form.description" label="Description" :rows="3" />
        <div class="teams-selector">
          <label class="teams-selector__label">Teams Involved</label>
          <div class="teams-selector__chips">
            <button
              v-for="team in ALL_TEAMS"
              :key="team"
              type="button"
              class="team-chip"
              :class="{ 'team-chip--active': selectedTeams.includes(team) }"
              @click="toggleTeam(team)"
            >
              {{ team }}
            </button>
          </div>
          <p v-if="selectedTeams.length === 0" class="teams-selector__hint">
            Select one or more teams
          </p>
        </div>
        <BaseTextarea
          v-model="form.requirements"
          label="Requirements"
          placeholder="What's needed to start..."
          :rows="2"
        />
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

    <BaseModal v-if="deleteTarget" title="Delete PR Package" @close="deleteTarget = null">
      <p>Delete PR package "{{ deleteTarget?.name }}"?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="deleteTarget = null">Cancel</BaseButton>
        <BaseButton variant="danger" :loading="deleting" @click="confirmDelete">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.pr-packages-view {
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
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-4;

    @include tablet {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mobile {
      grid-template-columns: 1fr;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__form-row {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: $spacing-4;
  }
}

.teams-selector {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }
}

.team-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-1;

  &--sm {
    gap: 4px;
  }
}

.team-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px $spacing-3;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  border: 1.5px solid $color-border;
  background-color: $color-bg;
  color: $color-text-secondary;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;
  user-select: none;
  line-height: 1;
  white-space: nowrap;
}

// Read-only chips (cards & view modal) — subtle, informational
span.team-chip {
  &.team-chip--active {
    border-color: $color-primary;
    background-color: $color-primary-light;
    color: $color-primary;
  }
}

// Interactive chip buttons (selector in form) — strong, actionable
button.team-chip {
  cursor: pointer;

  &:not(.team-chip--active):hover {
    border-color: $color-primary;
    color: $color-primary;
    background-color: $color-primary-light;
  }

  &.team-chip--active {
    border-color: $color-primary;
    background-color: $color-primary;
    color: #fff;

    &:hover {
      border-color: $color-primary-hover;
      background-color: $color-primary-hover;
    }
  }
}

.package-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__field {
    p {
      font-size: $font-size-sm;
      color: $color-text;
      line-height: $line-height-normal;
    }
  }

  &__label {
    display: block;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  &__pre {
    white-space: pre-line;
  }
}

.package-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition:
    box-shadow $transition-fast,
    border-color $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-primary;
  }

  &__header {
    padding: $spacing-4 $spacing-5;
    background-color: $color-primary-light;
    display: flex;
    align-items: center;
    gap: $spacing-3;
    flex-shrink: 0;
  }

  &__number {
    font-size: $font-size-sm;
    font-weight: $font-weight-bold;
    color: $color-primary;
    background-color: $color-bg-white;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-sm;
    flex-shrink: 0;
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
    flex: 1;
  }

  &__field {
    p {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      line-height: $line-height-normal;
    }
  }

  &__clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__label {
    display: block;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }

  &__footer {
    padding: $spacing-3 $spacing-5;
    border-top: 1px solid $color-border;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: $spacing-2;
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

  &__actions {
    display: flex;
    gap: $spacing-2;
  }
}
</style>
