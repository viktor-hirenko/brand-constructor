<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { User, UserRole } from '@brand-constructor/shared'
import { ROLE_LABELS, USER_ROLES } from '@brand-constructor/shared'
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const authStore = useAuthStore()
const { data: users, loading, fetchData: fetchUsers } = useApiList<User>('/api/users')

const {
  sortedData: sortedUsers,
  sortField,
  sortDirection,
  toggleSort,
} = useTableSort(users, 'created_at', 'desc')

const showModal = ref(false)
const editingUser = ref<User | null>(null)
const form = ref<{ name: string; email: string; role: UserRole }>({
  name: '',
  email: '',
  role: USER_ROLES.PRODUCT_OWNER,
})

const isEditing = computed(() => editingUser.value !== null)
const modalTitle = computed(() => (isEditing.value ? 'Edit User' : 'Add User'))
const submitLabel = computed(() => (isEditing.value ? 'Save Changes' : 'Add User'))

const roleOptions = Object.entries(USER_ROLES).map(([, value]) => ({
  value,
  label: ROLE_LABELS[value],
}))

const showRolesInfo = ref(false)
const rolesInfoRef = ref<HTMLElement | null>(null)

const deleteTarget = ref<User | null>(null)
const deleting = ref(false)

interface RolePermission {
  role: string
  canWrite: string
}

const rolePermissions: RolePermission[] = [
  { role: 'Admin', canWrite: 'Everything' },
  { role: 'Head of DHC', canWrite: 'Everything' },
  { role: 'Product Owner', canWrite: 'View only' },
  { role: 'CPO / CEO', canWrite: 'View only' },
  { role: 'Strategy & Identity', canWrite: 'Concepts, Namings' },
  { role: 'UI Designer', canWrite: 'UI Components' },
  { role: 'PR & Marketing', canWrite: 'PR Packages' },
  { role: 'Product Designer', canWrite: 'View only' },
]

function handleClickOutsideRolesInfo(event: MouseEvent) {
  if (rolesInfoRef.value && !rolesInfoRef.value.contains(event.target as Node)) {
    showRolesInfo.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutsideRolesInfo)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutsideRolesInfo)
})

onMounted(fetchUsers)

function openCreate() {
  editingUser.value = null
  form.value = { name: '', email: '', role: USER_ROLES.PRODUCT_OWNER }
  showModal.value = true
}

function openEdit(user: User) {
  editingUser.value = user
  form.value = { name: user.name, email: user.email, role: user.role }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.email.trim()) return
  try {
    if (isEditing.value && editingUser.value) {
      await apiPut(`/api/users/${editingUser.value.id}`, form.value)
    } else {
      await apiPost('/api/users', form.value)
    }
    closeModal()
    fetchUsers()
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Operation failed')
  }
}

function handleDelete(user: User) {
  deleteTarget.value = user
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await apiDelete(`/api/users/${deleteTarget.value.id}`)
    deleteTarget.value = null
    fetchUsers()
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete user')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="users-view">
    <div v-if="!authStore.isAdmin" class="users-view__forbidden">
      Access denied. Admin role required.
    </div>

    <template v-else>
      <div class="users-view__toolbar">
        <span class="users-view__count">{{ users.length }} users</span>
        <BaseButton @click="openCreate">+ Add User</BaseButton>
      </div>

      <div v-if="loading" class="users-view__loading">Loading...</div>

      <div v-else class="users-view__table-wrap">
        <table class="users-view__table">
          <thead>
            <tr>
              <th class="sortable-th" @click="toggleSort('name')">
                Name
                <span v-if="sortField === 'name'" class="sort-arrow">{{
                  sortDirection === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleSort('email')">
                Email
                <span v-if="sortField === 'email'" class="sort-arrow">{{
                  sortDirection === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleSort('role')">
                Role
                <span v-if="sortField === 'role'" class="sort-arrow">{{
                  sortDirection === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleSort('created_at')">
                Joined
                <span v-if="sortField === 'created_at'" class="sort-arrow">{{
                  sortDirection === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in sortedUsers" :key="u.id">
              <td class="users-view__name">{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ ROLE_LABELS[u.role] || u.role }}</td>
              <td>{{ new Date(u.created_at).toLocaleDateString() }}</td>
              <td class="users-view__actions">
                <BaseButton variant="secondary" size="sm" @click="openEdit(u)">Edit</BaseButton>
                <BaseButton
                  v-if="u.id !== authStore.user?.id"
                  variant="danger"
                  size="sm"
                  @click="handleDelete(u)"
                >
                  Delete
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BaseModal v-if="showModal" :title="modalTitle" @close="closeModal">
        <form class="users-view__form" @submit.prevent="handleSubmit">
          <BaseInput v-model="form.name" label="Name" placeholder="e.g. John Smith" required />
          <BaseInput
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="e.g. john@company.com"
            required
          />
          <div class="users-view__field">
            <div class="users-view__label-row">
              <label class="users-view__label">Role</label>
              <div ref="rolesInfoRef" class="users-view__role-info">
                <button
                  type="button"
                  class="users-view__info-btn"
                  :class="{ 'users-view__info-btn--active': showRolesInfo }"
                  aria-label="View role permissions"
                  @click="showRolesInfo = !showRolesInfo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Role permissions
                </button>

                <Transition name="popover">
                  <div v-if="showRolesInfo" class="roles-popover">
                    <div class="roles-popover__header">
                      <span class="roles-popover__title">Role permissions</span>
                      <button
                        type="button"
                        class="roles-popover__close"
                        @click="showRolesInfo = false"
                      >
                        ✕
                      </button>
                    </div>
                    <table class="roles-popover__table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Can edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="r in rolePermissions" :key="r.role">
                          <td>{{ r.role }}</td>
                          <td>
                            <span
                              class="roles-popover__badge"
                              :class="{
                                'roles-popover__badge--full': r.canWrite === 'Everything',
                                'roles-popover__badge--view': r.canWrite === 'View only',
                                'roles-popover__badge--partial':
                                  r.canWrite !== 'Everything' && r.canWrite !== 'View only',
                              }"
                              >{{ r.canWrite }}</span
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Transition>
              </div>
            </div>
            <select
              v-model="form.role"
              class="users-view__role-select users-view__role-select--full"
            >
              <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </form>
        <template #footer>
          <BaseButton variant="secondary" @click="closeModal">Cancel</BaseButton>
          <BaseButton :disabled="!form.name.trim() || !form.email.trim()" @click="handleSubmit">
            {{ submitLabel }}
          </BaseButton>
        </template>
      </BaseModal>

      <BaseModal v-if="deleteTarget" title="Delete User" @close="deleteTarget = null">
        <p>Delete user "{{ deleteTarget?.name }}" ({{ deleteTarget?.email }})?</p>
        <template #footer>
          <BaseButton variant="secondary" @click="deleteTarget = null">Cancel</BaseButton>
          <BaseButton variant="danger" :loading="deleting" @click="confirmDelete"
            >Delete</BaseButton
          >
        </template>
      </BaseModal>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.users-view {
  &__forbidden {
    text-align: center;
    padding: $spacing-12;
    color: $color-danger;
    font-size: $font-size-lg;
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
    border-collapse: separate;
    border-spacing: 0;
    background-color: $color-bg-white;

    @include mobile {
      min-width: 600px;
    }

    th,
    td {
      padding: $spacing-3 $spacing-4;
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
    }
  }

  &__name {
    font-weight: $font-weight-medium;
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

  &__role-select {
    padding: $spacing-1 $spacing-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    font-size: $font-size-sm;
    background-color: $color-bg-white;

    &--full {
      width: 100%;
      padding: $spacing-2 $spacing-3;
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

  &__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-1;

    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-2;
    }
  }

  &__role-info {
    position: relative;

    @include mobile {
      width: 100%;
    }
  }

  &__info-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: $font-size-xs;
    color: $color-text-muted;
    padding: 2px $spacing-2;
    border-radius: $radius-sm;
    transition:
      color $transition-fast,
      background-color $transition-fast;

    svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    &:hover,
    &--active {
      color: $color-primary;
      background-color: $color-primary-light;
    }
  }
}

.roles-popover {
  position: absolute;
  right: 0;
  top: calc(100% + $spacing-2);
  z-index: 100;
  width: 340px;
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  overflow: hidden;

  @include mobile {
    position: static;
    width: 100%;
    margin-top: $spacing-2;
    box-shadow: none;
    border-radius: $radius-md;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-3 $spacing-4;
    border-bottom: 1px solid $color-border;
    background-color: $color-bg;
  }

  &__title {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: $color-text;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: $color-text-muted;
    font-size: $font-size-xs;
    line-height: 1;
    padding: 2px;
    border-radius: $radius-sm;
    transition: color $transition-fast;

    &:hover {
      color: $color-text;
    }

    @include mobile {
      display: none;
    }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: $spacing-2 $spacing-4;
      text-align: left;
      border-bottom: 1px solid $color-border;
      font-size: $font-size-xs;
    }

    tr:last-child td {
      border-bottom: none;
    }

    th {
      font-weight: $font-weight-semibold;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: $color-bg;
    }

    td {
      color: $color-text;

      &:first-child {
        font-weight: $font-weight-medium;
        white-space: nowrap;
      }
    }
  }

  &__badge {
    display: inline-block;
    padding: 2px $spacing-2;
    border-radius: $radius-full;
    font-size: 11px;
    font-weight: $font-weight-medium;
    white-space: nowrap;

    &--full {
      background-color: #dcfce7;
      color: #15803d;
    }

    &--view {
      background-color: $color-bg;
      color: $color-text-muted;
    }

    &--partial {
      background-color: #eff6ff;
      color: #1d4ed8;
    }
  }
}

.popover-enter-active,
.popover-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
