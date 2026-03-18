import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@brand-constructor/shared/types';

const STORAGE_KEY = 'brand_constructor_auth';
const TOKEN_EXPIRE_BUFFER_SEC = 5 * 60;

interface StoredAuth {
  user: User;
  token: string;
}

function loadFromStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredAuth = JSON.parse(raw);
    const payloadB64 = stored.token.split('.')[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now <= TOKEN_EXPIRE_BUFFER_SEC) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const loading = ref(false);

  const stored = loadFromStorage();
  if (stored) {
    user.value = stored.user;
    token.value = stored.token;
  }

  const isAuthenticated = computed(() => user.value !== null);

  const userRole = computed(() => user.value?.role ?? null);

  const isCeoOrAdmin = computed(() => {
    const role = userRole.value;
    return role === 'cpo_ceo' || role === 'admin' || role === 'head_dhc';
  });

  const isAdmin = computed(() => {
    const role = userRole.value;
    return role === 'admin' || role === 'head_dhc';
  });

  const isProductOwner = computed(() => userRole.value === 'product_owner');

  async function loginWithGoogle(credential: string): Promise<void> {
    loading.value = true;
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Login failed');

      user.value = json.data.user as User;
      token.value = json.data.token as string;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: user.value, token: token.value }));
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    user.value = null;
    token.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  async function fetchCurrentUser(): Promise<void> {
    if (import.meta.env.VITE_ENVIRONMENT !== 'development') return;
    loading.value = true;
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/users/me`);
      const json = await response.json();
      if (json.success) {
        user.value = json.data as User;
      }
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    userRole,
    isCeoOrAdmin,
    isAdmin,
    isProductOwner,
    loginWithGoogle,
    logout,
    fetchCurrentUser,
  };
});
