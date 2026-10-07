import { createRouter, createWebHistory } from 'vue-router'
import { LIBRARY_TAB_ROLES, ORDER_ROLES, USER_ROLES } from '@brand-constructor/shared'
import { useAuthStore } from '@/stores/auth'
import { isStaleChunkError, reloadAddress } from '@/utils/staleRelease'

function getRequiredRoles(
  matched: { meta: { roles?: readonly string[] } }[]
): readonly string[] | undefined {
  for (let i = matched.length - 1; i >= 0; i--) {
    const roles = matched[i].meta.roles
    if (roles?.length) return roles
  }
  return undefined
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      // Variant 3 — Brands is the single entry point after login for every role
      // (backend filters the list per role; the sidebar shows Brands to all).
      path: '/',
      redirect: '/brands',
    },
    {
      // Orders (brief-orders plan, phase 2a): briefs `in_work` as the Strategy
      // team works them. The worker answers only these roles too.
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { roles: ORDER_ROLES },
    },
    {
      path: '/orders/:brandId',
      name: 'order-detail',
      component: () => import('@/views/OrderDetailView.vue'),
      meta: { roles: ORDER_ROLES },
    },
    {
      path: '/concepts',
      name: 'concepts',
      component: () => import('@/views/ConceptsView.vue'),
      meta: { roles: LIBRARY_TAB_ROLES },
    },
    {
      path: '/concepts/:id',
      name: 'concept-detail',
      component: () => import('@/views/ConceptDetailView.vue'),
      meta: { roles: LIBRARY_TAB_ROLES },
    },
    {
      path: '/namings',
      name: 'namings',
      component: () => import('@/views/NamingsView.vue'),
      meta: { roles: LIBRARY_TAB_ROLES },
    },
    {
      path: '/pr-packages',
      name: 'pr-packages',
      component: () => import('@/views/PrPackagesView.vue'),
      meta: { roles: LIBRARY_TAB_ROLES },
    },
    {
      path: '/components',
      name: 'components',
      component: () => import('@/views/ComponentsView.vue'),
      meta: { roles: LIBRARY_TAB_ROLES },
    },
    {
      path: '/components/:typeId',
      name: 'component-variants',
      component: () => import('@/views/ComponentVariantsView.vue'),
      meta: { roles: LIBRARY_TAB_ROLES },
    },
    {
      path: '/brands',
      name: 'brands',
      component: () => import('@/views/BrandsView.vue'),
    },
    {
      // Variant 3 — Wizard embedded as a tab. These render WizardWorkspaceView
      // (a same-origin iframe on `/wizard/*`) inside the Admin layout, keeping
      // the sidebar visible. Auth is covered by the default guard below.
      path: '/workspace/brand/:id',
      name: 'workspace-brand',
      component: () => import('@/views/WizardWorkspaceView.vue'),
    },
    {
      path: '/workspace/new',
      name: 'workspace-new',
      component: () => import('@/views/WizardWorkspaceView.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { roles: [USER_ROLES.ADMIN] },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
})

// A release replaces the files of every screen. A page opened before it still
// asks for the old ones, the request fails, and the click on a tab does
// nothing (owner, 07.10: «нажимаю вкладку, а переход не переходит»). Loading
// the clicked tab's address brings the new files; once per address, so a real
// outage is not a reload loop.
const RELOADED_FOR = 'bc-admin-reloaded-for'

/** The tab being opened right now; null when no click is in progress. */
let clicked: string | null = null

/** Loads the page anew at the clicked tab. False: already done for this address. */
export function reloadAfterRelease(): boolean {
  const { pathname, search, hash } = window.location
  let reloadedFor: string | null = null
  try {
    reloadedFor = sessionStorage.getItem(RELOADED_FOR)
  } catch {
    // No session storage: reload anyway, the new page will not fail the same way.
  }
  const target = reloadAddress(clicked, pathname + search + hash, reloadedFor)
  if (!target) return false
  try {
    sessionStorage.setItem(RELOADED_FOR, target)
  } catch {
    // Nothing to remember it in.
  }
  window.location.assign(target)
  return true
}

router.onError(error => {
  if (isStaleChunkError(error)) reloadAfterRelease()
})

router.afterEach((_to, _from, failure) => {
  clicked = null
  if (failure) return
  try {
    sessionStorage.removeItem(RELOADED_FOR)
  } catch {
    // Nothing to forget.
  }
})

router.beforeEach(async to => {
  clicked = to.fullPath

  // Skip auth checks in local development mode.
  // `import.meta.env.DEV` is a Vite compile-time constant — statically `false`
  // in `vite build`, so an env-variable typo cannot disable guards in prod.
  if (import.meta.env.DEV) return true

  const authStore = useAuthStore()

  // Wait for the first /api/auth/me to settle before deciding whether to
  // redirect. main.ts kicks off fetchCurrentUser() before mount, but in
  // Vue Router 4 the initial navigation can resolve in the window between
  // `app.use(router)` and `await router.isReady()` — in that window
  // user.value is still null and a refreshed authenticated user would get
  // bounced to /login. This wait makes the guard correct regardless of the
  // bootstrap ordering or any cached-bundle / hot-reload edge cases.
  if (!authStore.initialized) {
    await authStore.fetchCurrentUser()
  }

  // Already authenticated → redirect away from login page to the Brands home
  if (to.name === 'login') {
    if (authStore.isAuthenticated) return { name: 'brands' }
    return true
  }

  // Not authenticated → go to login
  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const requiredRoles = getRequiredRoles(to.matched)
  const userRole = authStore.user?.role
  if (requiredRoles && (!userRole || !requiredRoles.includes(userRole))) {
    return { name: 'brands' }
  }

  return true
})

export { router }
