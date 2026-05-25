import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConstructorStore } from '@/stores/constructor'
import { apiGet } from '@/composables/useApi'
import type { Brand, BrandStepData } from '@brand-constructor/shared/types'
import { resolveColdStartNavigation } from '@/router/coldStartNavigation'

function ceoReselectGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore()
  const store = useConstructorStore()
  const id = to.params.id as string
  if (!auth.isCeo) {
    return { path: `/constructor/brand/${id}` }
  }
  const st = store.brandStatus
  if (st !== 'submitted' && st !== 'needs_revision') {
    return { path: `/constructor/brand/${id}` }
  }
  return true
}

function poEditGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore()
  const store = useConstructorStore()
  const id = to.params.id as string
  if (auth.isCeo) {
    return { path: `/constructor/brand/${id}` }
  }
  if (store.brandStatus !== 'needs_revision') {
    return { path: `/constructor/brand/${id}` }
  }
  return true
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: '/constructor/brand/:id',
    name: 'brand-view',
    component: () => import('@/views/ConstructorLayout.vue'),
    meta: { requiresAuth: true, step: 8, title: 'Save', subtitle: 'Фінальний огляд' },
    children: [
      {
        path: '',
        name: 'brand-view-review',
        component: () => import('@/views/steps/ReviewSubmitView.vue'),
        meta: { step: 8, title: 'Save', subtitle: 'Фінальний огляд' },
      },
      {
        path: 'ceo-reselect/concept',
        name: 'ceo-reselect-concept',
        component: () => import('@/views/alternative-selection/AlternativeConceptView.vue'),
        meta: {
          step: 8,
          ceoReselect: true,
          ceoOnly: true,
          title: 'CEO — Concept',
          subtitle: '',
        },
        beforeEnter: ceoReselectGuard,
      },
      {
        path: 'ceo-reselect/concept/external-naming',
        name: 'ceo-reselect-concept-external-naming',
        component: () => import('@/views/alternative-selection/AlternativeExternalNamingView.vue'),
        meta: {
          step: 8,
          ceoReselect: true,
          ceoOnly: true,
          title: 'CEO — External Naming',
          subtitle: '',
        },
        beforeEnter: ceoReselectGuard,
      },
      {
        path: 'ceo-reselect/external-naming',
        name: 'ceo-reselect-external-naming',
        component: () => import('@/views/alternative-selection/AlternativeExternalNamingView.vue'),
        meta: {
          step: 8,
          ceoReselect: true,
          ceoOnly: true,
          title: 'CEO — External Naming',
          subtitle: '',
        },
        beforeEnter: ceoReselectGuard,
      },
      {
        path: 'ceo-reselect/internal-naming',
        name: 'ceo-reselect-internal-naming',
        component: () => import('@/views/alternative-selection/AlternativeInternalNamingView.vue'),
        meta: {
          step: 8,
          ceoReselect: true,
          ceoOnly: true,
          title: 'CEO — Internal Naming',
          subtitle: '',
        },
        beforeEnter: ceoReselectGuard,
      },
      // PO edit routes (returned-from-CEO flow)
      {
        path: 'po-edit/concept',
        name: 'po-edit-concept',
        component: () => import('@/views/revision-response/RevisionConceptView.vue'),
        meta: { step: 8, poEdit: true, title: 'Редагувати концепт', subtitle: '' },
        beforeEnter: poEditGuard,
      },
      {
        path: 'po-edit/concept/external-naming',
        name: 'po-edit-concept-external-naming',
        component: () => import('@/views/revision-response/RevisionExternalNamingView.vue'),
        meta: { step: 8, poEdit: true, title: 'Редагувати External Naming', subtitle: '' },
        beforeEnter: poEditGuard,
      },
      {
        path: 'po-edit/external-naming',
        name: 'po-edit-external-naming',
        component: () => import('@/views/revision-response/RevisionExternalNamingView.vue'),
        meta: { step: 8, poEdit: true, title: 'Редагувати External Naming', subtitle: '' },
        beforeEnter: poEditGuard,
      },
      {
        path: 'po-edit/internal-naming',
        name: 'po-edit-internal-naming',
        component: () => import('@/views/revision-response/RevisionInternalNamingView.vue'),
        meta: { step: 8, poEdit: true, title: 'Редагувати Internal Naming', subtitle: '' },
        beforeEnter: poEditGuard,
      },
    ],
    beforeEnter: async to => {
      const brandId = to.params.id as string
      const store = useConstructorStore()

      try {
        const brand = await apiGet<Brand>(`/api/brands/${brandId}`)
        const stepData = (brand.stepData ?? {
          brandBasics: {
            geo: brand.geo ? brand.geo.split(',') : [],
            launchDate: brand.launchDate ?? '',
            linkedProduct: '',
            comment: '',
          },
          mode: brand.mode ?? null,
          concept: {
            selectedId: brand.conceptId ?? null,
            comment: brand.conceptComment ?? '',
            newConceptBrief: brand.newConceptBrief ?? null,
          },
          externalNaming: {
            selectedIds: brand.externalNamingIds ?? [],
            comment: brand.externalNamingComment ?? '',
            newNamingBrief: brand.newNamingBrief ?? null,
          },
          internalNaming: {
            selectedId: brand.internalNamingId ?? null,
            comment: brand.internalNamingComment ?? '',
            newNamingFeedback: null,
          },
          marketingPackage: {
            selectedId: brand.prPackageId ?? null,
            comment: brand.prPackageComment ?? '',
          },
          deliverables: {
            legalLanding: brand.legalLanding ?? false,
            partnerLanding: brand.partnerLanding ?? false,
            developmentDeadline: brand.developmentDeadline ?? '',
            comment: brand.deliverablesComment ?? '',
          },
          visualComponents: {
            selections: brand.componentSelections ?? {},
            delegateToDesigners: brand.delegateToDesigners ?? false,
            comment: brand.componentsComment ?? '',
          },
        }) as BrandStepData
        store.loadBrand(
          brandId,
          stepData,
          brand.currentStep ?? 8,
          brand.status,
          brand.internalName ?? undefined,
          brand.ceoComments ?? undefined,
          brand.ceoSelections ?? undefined
        )

        // Restore in-progress localStorage drafts (F5-safe).
        // Called AFTER loadBrand so it overlays the freshly-reset slices.
        store.restoreSupervisorReselectDraftFromStorage(brandId)
        store.restoreAuthorRevisionDraftFromStorage(brandId)

        return true
      } catch {
        return { path: '/' }
      }
    },
  },
  {
    path: '/constructor',
    component: () => import('@/views/ConstructorLayout.vue'),
    meta: { requiresAuth: true, briefCreatorOnly: true },
    beforeEnter: to => {
      const stepMatch = to.path.match(/\/constructor\/step\/(\d+)/)
      if (!stepMatch) return true

      const targetStep = parseInt(stepMatch[1])
      const store = useConstructorStore()

      // Restore unsaved draft (e.g. after F5 / accidental tab close) before the
      // wizard mounts. Only applies to new-brand sessions that have no server ID yet.
      if (!store.brandId) {
        store.restoreDraftFromStorage()
      }

      if (targetStep <= 1) return true

      if (targetStep > store.currentStep) {
        return { path: `/constructor/step/${store.currentStep}` }
      }
      return true
    },
    children: [
      {
        path: '',
        redirect: '/constructor/step/1',
      },
      {
        path: 'step/1',
        name: 'step-1',
        component: () => import('@/views/steps/BrandBasicsView.vue'),
        meta: { step: 1, title: 'Brand Basics', subtitle: 'GEO та опис' },
      },
      {
        path: 'step/2',
        name: 'step-2',
        component: () => import('@/views/steps/ConceptSelectionView.vue'),
        meta: {
          step: 2,
          title: 'Concept Selection',
          subtitle: "Оберіть концепт та перегляньте прев'ю праворуч.",
        },
      },
      {
        path: 'step/3',
        name: 'step-3',
        component: () => import('@/views/steps/ExternalNamingView.vue'),
        meta: {
          step: 3,
          title: 'External Naming',
          subtitle: 'Оберіть до 3-х назв, що пройдуть перевірку юристами на можливі ризики.',
        },
      },
      {
        path: 'step/4',
        name: 'step-4',
        component: () => import('@/views/steps/InternalNamingView.vue'),
        meta: {
          step: 4,
          title: 'Internal Naming',
          subtitle: 'Оберіть назву для внутрішньої комунікації команди.',
        },
      },
      {
        path: 'step/5',
        name: 'step-5',
        component: () => import('@/views/steps/MarketingPackageView.vue'),
        meta: { step: 5, title: 'Marketing Package', subtitle: 'PR пакет для запуску' },
      },
      {
        path: 'step/6',
        name: 'step-6',
        component: () => import('@/views/steps/DeliverablesView.vue'),
        meta: { step: 6, title: 'Deliverables', subtitle: 'Додаткові опції' },
      },
      {
        path: 'step/7',
        name: 'step-7',
        component: () => import('@/views/steps/VisualComponentsView.vue'),
        meta: { step: 7, title: 'Visual Components ⭐', subtitle: 'Візуальні компоненти' },
      },
      {
        path: 'step/8',
        name: 'step-8',
        component: () => import('@/views/steps/ReviewSubmitView.vue'),
        meta: { step: 8, title: 'Save', subtitle: 'Фінальний огляд' },
      },
    ],
  },
  {
    path: '/constructor/success',
    name: 'brand-success',
    component: () => import('@/views/BrandSuccessView.vue'),
    meta: { requiresAuth: true, briefCreatorOnly: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Cold-start (F5 / direct-URL) handling. `from.name === undefined` is the
// Vue Router 4 signal for the initial cold navigation (no prior SPA history).
//
// Dedicated review sub-routes (`/po-edit/*`, `/ceo-reselect/*`) keep the
// user on the page they returned to — in-progress drafts are restored from
// localStorage by the per-brand `beforeEnter` guard (see
// `restoreSupervisorReselectDraftFromStorage` /
// `restoreAuthorRevisionDraftFromStorage`).
//
// Wizard URLs (`/constructor/step/N`) entered from the review screen for
// non-naming sections (basics, marketing package, deliverables, visual
// components) don't carry a brand id in the path, so ReviewSubmitView marks
// those navigations with `?editBrand=<id>`. On a cold start we use that
// query param to redirect back to the right brand review page.
router.beforeEach((to, from) => {
  return resolveColdStartNavigation({
    fromName: from.name,
    toQueryEditBrand: to.query.editBrand,
  })
})

router.beforeEach(async to => {
  // Skip auth/role guards in local dev. `import.meta.env.DEV` is a Vite
  // compile-time constant (`true` for `vite dev`, statically `false` for
  // `vite build`) — guarantees the bypass cannot be re-enabled in production
  // via an env-variable typo.
  if (import.meta.env.DEV) return true

  const authStore = useAuthStore()

  // Wait for the first /api/auth/me to settle before deciding whether to
  // redirect. See packages/admin/src/router/index.ts for the full
  // rationale — same race between Vue Router's initial navigation and the
  // `await fetchCurrentUser()` in main.ts.
  if (!authStore.initialized) {
    await authStore.fetchCurrentUser()
  }

  if (to.name === 'login') {
    if (authStore.isAuthenticated) return { path: '/constructor' }
    return true
  }

  if (to.name === 'landing') return true

  if (to.matched.some(r => r.meta.requiresAuth) && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.matched.some(r => r.meta.briefCreatorOnly) && !authStore.canStartNewBrandBrief) {
    return { path: '/' }
  }

  return true
})

export default router
