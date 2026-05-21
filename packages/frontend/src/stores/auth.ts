import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@brand-constructor/shared'
import { ADMIN_ROLES, LIBRARY_WRITE_PERMISSIONS } from '@brand-constructor/shared'

// F-05: one-off cleanup of the pre-F-05 localStorage JWT — see constructor
// stores/auth.ts for the full rationale.
const LEGACY_STORAGE_KEY = 'brand_constructor_auth'
try {
  localStorage.removeItem(LEGACY_STORAGE_KEY)
} catch {
  // harmless
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  // F-05: CSRF token issued by the worker, kept only in memory; forwarded
  // as X-CSRF-Token on mutating requests by useApi.
  const csrfToken = ref<string | null>(null)
  const loading = ref(false)
  // F-05: see constructor stores/auth.ts.
  const initialized = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() =>
    user.value ? (ADMIN_ROLES as readonly string[]).includes(user.value.role) : false
  )

  function canWriteLibrary(library: string): boolean {
    if (!user.value) return false
    const allowed = LIBRARY_WRITE_PERMISSIONS[library]
    return allowed ? allowed.includes(user.value.role as UserRole) : false
  }

  async function loginWithGoogle(credential: string): Promise<void> {
    loading.value = true
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      const json = await response.json()
      if (!json.success) throw new Error(json.error || 'Login failed')

      user.value = json.data.user as User
      csrfToken.value = (json.data.csrfToken as string | undefined) ?? null
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // network failure — local state still cleared; cookie expires on its own
    }
    user.value = null
    csrfToken.value = null
  }

  async function fetchCurrentUser(): Promise<void> {
    loading.value = true
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: 'include',
      })
      if (!response.ok) {
        user.value = null
        csrfToken.value = null
        return
      }
      const json = await response.json()
      if (json.success) {
        user.value = json.data.user as User
        csrfToken.value = (json.data.csrfToken as string | undefined) ?? null
      } else {
        user.value = null
        csrfToken.value = null
      }
    } catch {
      user.value = null
      csrfToken.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  return {
    user,
    csrfToken,
    loading,
    initialized,
    isAuthenticated,
    isAdmin,
    canWriteLibrary,
    loginWithGoogle,
    logout,
    fetchCurrentUser,
  }
})
