<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { User } from '@brand-constructor/shared';
import { ROLE_LABELS, USER_ROLES } from '@brand-constructor/shared';
import { apiPut } from '@/composables/useApi';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const users = ref<User[]>([]);
const loading = ref(false);

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

async function changeRole(userId: string, newRole: string) {
  await apiPut(`/api/users/${userId}/role`, { role: newRole });
  fetchUsers();
}

const roleOptions = Object.entries(USER_ROLES).map(([, value]) => ({
  value,
  label: ROLE_LABELS[value],
}));
</script>

<template>
  <div class="users-view">
    <div v-if="!authStore.isAdmin" class="users-view__forbidden">
      Access denied. Admin role required.
    </div>

    <template v-else>
      <div v-if="loading" class="users-view__loading">Loading...</div>

      <table v-else class="users-view__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="users-view__name">{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td>
              <select
                :value="u.role"
                class="users-view__role-select"
                @change="(e) => changeRole(u.id, (e.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="opt in roleOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td>{{ new Date(u.created_at).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
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

  &__role-select {
    padding: $spacing-1 $spacing-2;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    font-size: $font-size-sm;
    background-color: $color-bg-white;
  }
}
</style>
