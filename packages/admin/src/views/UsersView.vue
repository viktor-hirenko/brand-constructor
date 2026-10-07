<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { User, UserRole } from '@brand-constructor/shared'
import { ROLE_LABELS, USER_ROLES } from '@brand-constructor/shared'
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import { useTableSort } from '@/composables/useTableSort'
import RowAction from '@/components/ui/RowAction.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SearchSelect from '@/components/ui/SearchSelect.vue'
import { ALL, distinctOptions, matchesChoice, matchesText, shownOf } from '@/utils/tableSearch'
import { useAuthStore } from '@/stores/auth'
import { useDeleteAnimation } from '@/composables/useDeleteAnimation'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useErrorDialog } from '@/composables/useErrorDialog'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import close from '@phosphor-icons/core/regular/x.svg?raw'

const { showError } = useErrorDialog()

const { transitionName, playDelete } = useDeleteAnimation()

const authStore = useAuthStore()
const { data: users, loading, fetchData: fetchUsers } = useApiList<User>('/api/users')

// Search by name or e-mail and a filter by role, over the loaded rows.
const searchQuery = ref('')
const roleFilter = ref<string | null>(ALL)
const roleFilterOptions = computed(() =>
  distinctOptions(users.value.map(u => u.role), 'Усі ролі', role => ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role)
)
const foundUsers = computed(() =>
  users.value.filter(u => matchesText([u.name, u.email], searchQuery.value) && matchesChoice(u.role, roleFilter.value))
)

const {
  sortedData: sortedUsers,
  sortField,
  sortDirection,
  toggleSort,
} = useTableSort(foundUsers, 'created_at', 'desc')

const showModal = ref(false)
const editingUser = ref<User | null>(null)
const form = ref<{ name: string; email: string; role: UserRole }>({
  name: '',
  email: '',
  role: USER_ROLES.PRODUCT_OWNER,
})

const isEditing = computed(() => editingUser.value !== null)
const modalTitle = computed(() => (isEditing.value ? 'Редагувати користувача' : 'Новий користувач'))
const submitLabel = computed(() => (isEditing.value ? 'Зберегти' : 'Додати'))

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
  { role: 'Admin', canWrite: 'Усе' },
  { role: 'Head of DHC', canWrite: 'Усе' },
  { role: 'Product Owner', canWrite: 'Лише перегляд' },
  { role: 'CPO / CEO', canWrite: 'Лише перегляд' },
  { role: 'Strategy & Identity', canWrite: 'Концепти, неймінги' },
  { role: 'UI Designer', canWrite: 'UI-компоненти' },
  { role: 'PR & Marketing', canWrite: 'PR-пакети' },
  { role: 'Product Designer', canWrite: 'Лише перегляд' },
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
    fetchUsers({ silent: true })
  } catch (err) {
    showError(err, 'save')
  }
}

function handleDelete(user: User) {
  deleteTarget.value = user
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const id = deleteTarget.value.id
    await apiDelete(`/api/users/${id}`)
    deleteTarget.value = null
    // In place + quiet refresh — see BrandsView `confirmDeleteBrand`.
    playDelete(() => {
      users.value = users.value.filter(u => u.id !== id)
    }, () => fetchUsers({ silent: true }))
  } catch (err) {
    showError(err, 'delete')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="users-view">
    <div v-if="!authStore.isStrictAdmin" class="users-view__forbidden">
      Немає доступу. Потрібна роль Admin.
    </div>

    <template v-else>
      <div class="users-view__toolbar">
        <div class="users-view__filters">
          <SearchInput id="users-search" v-model="searchQuery" placeholder="Пошук за ім’ям або поштою" />
          <SearchSelect
            id="users-role"
            v-model="roleFilter"
            class="users-view__role"
            :options="roleFilterOptions"
            aria-label="Роль"
          />
          <span class="users-view__count">{{ shownOf(foundUsers.length, users.length) }}{{ users.length }} users</span>
        </div>
        <BaseButton @click="openCreate">+ Додати користувача</BaseButton>
      </div>

      <div v-if="loading" class="users-view__loading">Завантаження…</div>

      <div v-else class="users-view__table-wrap">
        <table class="users-view__table">
          <thead>
            <tr>
              <th class="sortable-th" @click="toggleSort('name')">
                Ім'я
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
                Роль
                <span v-if="sortField === 'role'" class="sort-arrow">{{
                  sortDirection === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleSort('created_at')">
                Додано
                <span v-if="sortField === 'created_at'" class="sort-arrow">{{
                  sortDirection === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="users-view__actions-head">Дії</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" :name="transitionName">
            <tr v-if="sortedUsers.length === 0" key="empty">
              <td colspan="5" class="users-view__empty">Нічого не знайдено</td>
            </tr>
            <tr v-for="u in sortedUsers" :key="u.id">
              <td class="users-view__name">{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ ROLE_LABELS[u.role] || u.role }}</td>
              <td>{{ new Date(u.created_at).toLocaleDateString() }}</td>
              <td class="users-view__actions">
                <RowAction kind="edit" label="Редагувати" @click="openEdit(u)" />
                <RowAction v-if="u.id !== authStore.user?.id" kind="delete" label="Видалити" @click="handleDelete(u)" />
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>

      <BaseModal v-if="showModal" :title="modalTitle" @close="closeModal">
        <form class="users-view__form" @submit.prevent="handleSubmit">
          <BaseInput v-model="form.name" label="Ім'я" placeholder="напр. Олена Коваль" required />
          <BaseInput
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="напр. olena@upstars.com"
            required
          />
          <div class="users-view__field">
            <div class="users-view__label-row">
              <label class="users-view__label">Роль</label>
              <div ref="rolesInfoRef" class="users-view__role-info">
                <button
                  type="button"
                  class="users-view__info-btn"
                  :class="{ 'users-view__info-btn--active': showRolesInfo }"
                  aria-label="Права ролей"
                  @click="showRolesInfo = !showRolesInfo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Права ролей
                </button>

                <Transition name="popover">
                  <div v-if="showRolesInfo" class="roles-popover">
                    <div class="roles-popover__header">
                      <span class="roles-popover__title">Права ролей</span>
                      <button
                        type="button"
                        class="roles-popover__close"
                        aria-label="Закрити"
                        @click="showRolesInfo = false"
                      >
                        <PhosphorIcon :svg="close" class="roles-popover__close-icon" />
                      </button>
                    </div>
                    <table class="roles-popover__table">
                      <thead>
                        <tr>
                          <th>Роль</th>
                          <th>Може змінювати</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="r in rolePermissions" :key="r.role">
                          <td>{{ r.role }}</td>
                          <td>
                            <span
                              class="roles-popover__badge"
                              :class="{
                                'roles-popover__badge--full': r.canWrite === 'Усе',
                                'roles-popover__badge--view': r.canWrite === 'Лише перегляд',
                                'roles-popover__badge--partial':
                                  r.canWrite !== 'Усе' && r.canWrite !== 'Лише перегляд',
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
          <BaseButton variant="secondary" @click="closeModal">Скасувати</BaseButton>
          <BaseButton :disabled="!form.name.trim() || !form.email.trim()" @click="handleSubmit">
            {{ submitLabel }}
          </BaseButton>
        </template>
      </BaseModal>

      <BaseModal v-if="deleteTarget" title="Видалити користувача" @close="deleteTarget = null">
        <p>Видалити користувача «{{ deleteTarget?.name }}» ({{ deleteTarget?.email }})?</p>
        <template #footer>
          <BaseButton variant="secondary" @click="deleteTarget = null">Скасувати</BaseButton>
          <BaseButton variant="danger" :loading="deleting" @click="confirmDelete"
            >Видалити</BaseButton
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

  &__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-3;
  }

  &__role {
    width: 220px;
    max-width: 100%;
  }

  &__empty {
    padding: $spacing-8 $spacing-3;
    text-align: center;
    color: $color-text-secondary;
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

    @include scroll-table-cells;

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
    @include sticky-actions($color-bg-white);
  }

  &__table &__actions-head {
    @include sticky-actions($color-bg);
    z-index: 2;
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

  // DP-15859: "Close → X, Regular" (`5658:39246`). No Admin mock-up, so the
  // glyph keeps the footprint the `✕` character had at this font size.
  &__close-icon {
    display: block;
    width: 14px;
    height: 14px;
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
