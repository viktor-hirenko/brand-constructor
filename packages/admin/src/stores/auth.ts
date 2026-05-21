import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@brand-constructor/shared'
import { ADMIN_ROLES, LIBRARY_WRITE_PERMISSIONS } from '@brand-constructor/shared'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  // CSRF token issued by the worker, kept only in memory; forwarded as
  // X-CSRF-Token on mutating requests by useApi.
  const csrfToken = ref<string | null>(null)
  const loading = ref(false)
  // Set to `true` once `fetchCurrentUser` has resolved at least once. The
  // router guard waits for this before deciding to redirect, so an
  // authenticated reload doesn't briefly bounce to /login while /me is in
  // flight.
  const initialized = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() =>
    user.value ? (ADMIN_ROLES as readonly string[]).includes(user.value.role) : false
  )
  const isStrictAdmin = computed(() => user.value?.role === 'admin')

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
    // Clear local auth state BEFORE the network call so that any synchronous
    // router navigation triggered by the caller sees `isAuthenticated === false`.
    // If we waited for the fetch to resolve first, the beforeEach guard
    // would race with the user-facing redirect and could bounce the user
    // back into the app on Sign-out.
    user.value = null
    csrfToken.value = null
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // network failure — local state already cleared; cookie expires on its own
    }
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
    isStrictAdmin,
    canWriteLibrary,
    loginWithGoogle,
    logout,
    fetchCurrentUser,
  }
})
