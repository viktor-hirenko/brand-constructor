import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, UserRole } from '@brand-constructor/shared';
import { ADMIN_ROLES, LIBRARY_WRITE_PERMISSIONS } from '@brand-constructor/shared';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() =>
    user.value ? (ADMIN_ROLES as readonly string[]).includes(user.value.role) : false
  );

  function canWriteLibrary(library: string): boolean {
    if (!user.value) return false;
    const allowed = LIBRARY_WRITE_PERMISSIONS[library];
    return allowed ? allowed.includes(user.value.role) : false;
  }

  async function fetchCurrentUser() {
    loading.value = true;
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/users/me`);
      const json = await response.json();
      if (json.success) {
        user.value = json.data;
      }
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    canWriteLibrary,
    fetchCurrentUser,
  };
});
