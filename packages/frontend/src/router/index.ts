import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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

  return true
})

export { router }
