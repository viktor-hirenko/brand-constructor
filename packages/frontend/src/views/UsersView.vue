<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { User } from '@brand-constructor/shared';
import { ROLE_LABELS, USER_ROLES } from '@brand-constructor/shared';
import { apiPost, apiPut, apiDelete } from '@/composables/useApi';
import { useAuthStore } from '@/stores/auth';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

const authStore = useAuthStore();
const users = ref<User[]>([]);
const loading = ref(false);

const showModal = ref(false);
const editingUser = ref<User | null>(null);
const form = ref({ name: '', email: '', role: USER_ROLES.PRODUCT_OWNER });

const isEditing = computed(() => editingUser.value !== null);
const modalTitle = computed(() => isEditing.value ? 'Edit User' : 'Add User');
const submitLabel = computed(() => isEditing.value ? 'Save Changes' : 'Add User');

const roleOptions = Object.entries(USER_ROLES).map(([, value]) => ({
  value,
  label: ROLE_LABELS[value],
}));

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await fetch('/api/users');
    const json = await res.json();
    if (json.success) users.value = json.data;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);

function openCreate() {
  editingUser.value = null;
  form.value = { name: '', email: '', role: USER_ROLES.PRODUCT_OWNER };
  showModal.value = true;
}

function openEdit(user: User) {
  editingUser.value = user;
  form.value = { name: user.name, email: user.email, role: user.role };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingUser.value = null;
}

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.email.trim()) return;
  try {
    if (isEditing.value && editingUser.value) {
      await apiPut(`/api/users/${editingUser.value.id}`, form.value);
    } else {
      await apiPost('/api/users', form.value);
    }
    closeModal();
    fetchUsers();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Operation failed');
  }
}

async function handleDelete(user: User) {
  if (!confirm(`Delete user "${user.name}" (${user.email})?`)) return;
  try {
    await apiDelete(`/api/users/${user.id}`);
    fetchUsers();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete user');
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
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td class="users-view__name">{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ ROLE_LABELS[u.role] || u.role }}</td>
              <td>{{ new Date(u.created_at).toLocaleDateString() }}</td>
              <td class="users-view__actions">
                <BaseButton size="sm" @click="openEdit(u)">Edit</BaseButton>
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

      <BaseModal
        v-if="showModal"
        :title="modalTitle"
        @close="closeModal"
      >
        <form class="users-view__form" @submit.prevent="handleSubmit">
          <BaseInput v-model="form.name" label="Name" placeholder="e.g. John Smith" required />
          <BaseInput v-model="form.email" label="Email" type="email" placeholder="e.g. john@company.com" required />
          <div class="users-view__field">
            <label class="users-view__label">Role</label>
            <select v-model="form.role" class="users-view__role-select users-view__role-select--full">
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
    </template>
  </div>
</template>

<style lang="scss" scoped>
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
  }

  &__table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background-color: $color-bg-white;

    th, td {
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
}
</style>
