import { createRouter, createWebHistory } from 'vue-router'
import { ADMIN_ROLES } from '@brand-constructor/shared'
import { useAuthStore } from '@/stores/auth'

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
      path: '/',
      redirect: '/concepts',
    },
    {
      path: '/concepts',
      name: 'concepts',
      component: () => import('@/views/ConceptsView.vue'),
    },
    {
      path: '/concepts/:id',
      name: 'concept-detail',
      component: () => import('@/views/ConceptDetailView.vue'),
    },
    {
      path: '/namings',
      name: 'namings',
      component: () => import('@/views/NamingsView.vue'),
    },
    {
      path: '/pr-packages',
      name: 'pr-packages',
      component: () => import('@/views/PrPackagesView.vue'),
    },
    {
      path: '/components',
      name: 'components',
      component: () => import('@/views/ComponentsView.vue'),
    },
    {
      path: '/components/:typeId',
      name: 'component-variants',
      component: () => import('@/views/ComponentVariantsView.vue'),
    },
    {
      path: '/brands',
      name: 'brands',
      component: () => import('@/views/BrandsView.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { roles: [...ADMIN_ROLES] },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
})

router.beforeEach(to => {
  // Skip auth checks in local development mode.
  // `import.meta.env.DEV` is a Vite compile-time constant — statically `false`
  // in `vite build`, so an env-variable typo cannot disable guards in prod.
  if (import.meta.env.DEV) return true

  const authStore = useAuthStore()

  // Already authenticated → redirect away from login page
  if (to.name === 'login') {
    if (authStore.isAuthenticated) return { name: 'concepts' }
    return true
  }

  // Not authenticated → go to login
  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const requiredRoles = getRequiredRoles(to.matched)
  const userRole = authStore.user?.role
  if (requiredRoles && (!userRole || !requiredRoles.includes(userRole))) {
    return { name: 'concepts' }
  }

  return true
})

export { router }
