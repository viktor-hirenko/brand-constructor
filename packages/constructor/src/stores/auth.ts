import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { isBrandBriefCreatorRole } from '@brand-constructor/shared';
import type { User } from '@brand-constructor/shared/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  // F-05: CSRF token derived server-side from the auth JWT. Kept in Pinia
  // only (never localStorage), refreshed on every /api/auth/me response, and
  // forwarded by useApi as `X-CSRF-Token` on mutating requests.
  const csrfToken = ref<string | null>(null);
  const loading = ref(false);
  // F-05: set to true once `fetchCurrentUser` has resolved at least once,
  // regardless of whether the user turned out to be authenticated. Router
  // guards must wait for this before deciding to redirect to /login —
  // otherwise an authenticated user reloading the page would briefly see a
  // login bounce while /me is in flight.
  const initialized = ref(false);

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

  const canStartNewBrandBrief = computed(() => {
    const role = userRole.value;
    return role !== null && isBrandBriefCreatorRole(role);
  });

  async function loginWithGoogle(credential: string): Promise<void> {
    loading.value = true;
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Login failed');

      user.value = json.data.user as User;
      csrfToken.value = (json.data.csrfToken as string | undefined) ?? null;
      initialized.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    // F-23: clear local auth state BEFORE the network call. There is no
    // Sign-out UI in the constructor SPA today, but Option B from the
    // tracker keeps both stores symmetric so the same router-guard race
    // condition cannot re-appear if a Sign-out button is added later.
    user.value = null;
    csrfToken.value = null;
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Network failure — local state is already cleared so the UI logs
      // out immediately. The HttpOnly cookie will eventually expire on
      // its own (24h TTL); user can also re-login to overwrite it.
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    loading.value = true;
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: 'include',
      });
      if (!response.ok) {
        user.value = null;
        csrfToken.value = null;
        return;
      }
      const json = await response.json();
      if (json.success) {
        user.value = json.data.user as User;
        csrfToken.value = (json.data.csrfToken as string | undefined) ?? null;
      } else {
        user.value = null;
        csrfToken.value = null;
      }
    } catch {
      user.value = null;
      csrfToken.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  return {
    user,
    csrfToken,
    loading,
    initialized,
    isAuthenticated,
    userRole,
    isCeoOrAdmin,
    isAdmin,
    isProductOwner,
    canStartNewBrandBrief,
    loginWithGoogle,
    logout,
    fetchCurrentUser,
  };
});
