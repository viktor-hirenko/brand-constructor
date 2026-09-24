import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { brandHasNewBriefs } from '@brand-constructor/shared'
import { useConstructorStore } from '@/stores/constructor'
import { apiGet } from '@/composables/useApi'
import type { Brand } from '@brand-constructor/shared/types'
import { resolveColdStartNavigation } from '@/router/coldStartNavigation'
import { isEmbedded } from '@/composables/useEmbedMode'
import { postAuthRequired } from '@/composables/useEmbedBridge'
import { applyBrandToStore, buildStepDataFromBrand, clampWizardStep, wizardStepLocation } from '@/utils/brandHydration'

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

/**
 * Guards the draft inline-edit cascade routes (`/draft-edit/*`). These are the
 * dedicated edit-flow screens the Author (PO) opens from the *draft* final
 * review to re-pick a concept and the dependent external naming. Only the
 * brand owner (non-CEO) editing a `draft` brief may enter.
 */
function draftEditGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore()
  const store = useConstructorStore()
  const id = to.params.id as string
  if (auth.isCeo) {
    return { path: `/constructor/brand/${id}` }
  }
  const inWorkWithTeam =
    store.brandStatus === 'submitted' &&
    brandHasNewBriefs({
      newConceptBrief: store.stepData?.concept?.newConceptBrief ?? null,
      newNamingBrief: store.stepData?.externalNaming?.newNamingBrief ?? null,
      stepData: store.stepData,
    })
  if (store.brandStatus !== 'draft' && !inWorkWithTeam) {
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
    component: () => import('@/views/BriefShellView.vue'),
    meta: {
      requiresAuth: true,
      step: 8,
      title: 'Final review',
      subtitle: 'Перевірте всі дані перед відправкою.',
    },
    children: [
      {
        path: '',
        name: 'brand-view-review',
        component: () => import('@/views/wizard/BriefReviewView.vue'),
        meta: {
          step: 8,
          title: 'Final review',
          subtitle: 'Перевірте всі дані перед відправкою.',
        },
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
      // Draft inline-edit cascade routes (concept → external naming).
      // Opened from the draft final review; mirror the po-edit pattern but for
      // `draft` status. `draftEdit` meta drives the edit layout/preview reuse.
      {
        path: 'draft-edit/concept',
        name: 'draft-edit-concept',
        component: () => import('@/views/draft-edit/DraftConceptEditView.vue'),
        meta: { step: 8, draftEdit: true, title: 'Редагувати концепт', subtitle: '' },
        beforeEnter: draftEditGuard,
      },
      {
        path: 'draft-edit/concept/external-naming',
        name: 'draft-edit-concept-external-naming',
        component: () => import('@/views/draft-edit/DraftExternalNamingEditView.vue'),
        meta: { step: 8, draftEdit: true, title: 'Редагувати External Naming', subtitle: '' },
        beforeEnter: draftEditGuard,
      },
    ],
    beforeEnter: async to => {
      const brandId = to.params.id as string
      const store = useConstructorStore()

      try {
        const brand = await apiGet<Brand>(`/api/brands/${brandId}`)
        const stepData = buildStepDataFromBrand(brand)
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
        store.restoreSupervisorAlternativeDraftFromStorage(brandId)
        store.restoreSupervisorCommentsFromStorage(brandId)
        store.restoreAuthorRevisionDraftFromStorage(brandId)
        store.restorePreviewSlidesFromStorage(brandId)

        return true
      } catch {
        return { path: '/' }
      }
    },
  },
  {
    path: '/constructor',
    component: () => import('@/views/BriefShellView.vue'),
    meta: { requiresAuth: true, briefCreatorOnly: true },
    beforeEnter: async to => {
      const stepMatch = to.path.match(/\/constructor\/step\/(\d+)/)
      if (!stepMatch) return true

      const targetStep = parseInt(stepMatch[1])
      const store = useConstructorStore()
      const brandQuery = to.query.brand

      if (typeof brandQuery === 'string' && brandQuery && store.brandId !== brandQuery) {
        try {
          const brand = await apiGet<Brand>(`/api/brands/${brandQuery}`)
          if (brand.status !== 'draft') {
            return { path: `/constructor/brand/${brandQuery}` }
          }
          applyBrandToStore(store, brand)
        } catch {
          return { path: '/' }
        }
      } else if (!store.brandId) {
        store.restoreDraftFromStorage()
      }

      if (targetStep <= 1) return true

      if (targetStep > store.currentStep) {
        return {
          ...wizardStepLocation(store.currentStep, store.brandId, typeof to.query.editBrand === 'string' ? to.query.editBrand : null),
        }
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
        component: () => import('@/views/wizard/BrandBasicsView.vue'),
        meta: { step: 1, title: 'Brand Basics', subtitle: 'GEO та опис' },
      },
      {
        path: 'step/2',
        name: 'step-2',
        component: () => import('@/views/wizard/ConceptSelectionView.vue'),
        meta: {
          step: 2,
          title: 'Concept Selection',
          subtitle: "Оберіть концепт та перегляньте прев'ю праворуч.",
        },
      },
      {
        path: 'step/3',
        name: 'step-3',
        component: () => import('@/views/wizard/ExternalNamingView.vue'),
        meta: {
          step: 3,
          title: 'External Naming',
          subtitle: 'Оберіть до 3-х назв, що пройдуть перевірку юристами на можливі ризики.',
        },
      },
      {
        path: 'step/4',
        name: 'step-4',
        component: () => import('@/views/wizard/InternalNamingView.vue'),
        meta: {
          step: 4,
          title: 'Internal Naming',
          subtitle: 'Оберіть назву для внутрішньої комунікації команди.',
        },
      },
      {
        path: 'step/5',
        name: 'step-5',
        component: () => import('@/views/wizard/MarketingPackageView.vue'),
        meta: { step: 5, title: 'Marketing Package', subtitle: 'PR пакет для запуску' },
      },
      {
        path: 'step/6',
        name: 'step-6',
        component: () => import('@/views/wizard/DeliverablesView.vue'),
        meta: { step: 6, title: 'Deliverables', subtitle: 'Додаткові опції' },
      },
      {
        path: 'step/7',
        name: 'step-7',
        component: () => import('@/views/wizard/VisualComponentsView.vue'),
        // Kit `Step header` `5382:57234`, read off the render and confirmed by
        // `get_design_context`: the screen is called `Interface Components`,
        // and its description is a sentence like every other step's. Steps 2,
        // 3 and 4 already matched the kit word for word — this one carried a
        // stray `⭐` and a label instead of the sentence. Step 8's header is
        // the review screen's own component and moves with that work.
        meta: {
          step: 7,
          title: 'Interface Components',
          subtitle:
            'Оберіть варіант структури для кожного компонента або довірте вибір дизайнерам.',
        },
      },
      {
        path: 'step/8',
        name: 'step-8',
        component: () => import('@/views/wizard/BriefReviewView.vue'),
        meta: {
          step: 8,
          title: 'Final review',
          subtitle: 'Перевірте всі дані перед відправкою.',
        },
      },
    ],
  },
  {
    path: '/constructor/success',
    name: 'brand-success',
    component: () => import('@/views/BrandSuccessView.vue'),
    // No `briefCreatorOnly` guard — Supervisors must also reach this page
    // after dispatching needs_revision / approved. Role-specific UI (e.g.
    // "Створити новий бриф") is gated inside BrandSuccessView via
    // `authStore.canStartNewBrandBrief` at the template level.
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

const router = createRouter({
  // `import.meta.env.BASE_URL` === Vite `base` ('/wizard/' on the unified
  // single-origin deploy, '/' in isolated builds). Keeps every router-relative
  // path (e.g. '/constructor/step/1') correctly prefixed without touching
  // route definitions.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Cold-start (F5 / direct-URL) handling. `from.name === undefined` is the
// Vue Router 4 signal for the initial cold navigation (no prior SPA history).
//
// Dedicated review sub-routes (`/po-edit/*`, `/ceo-reselect/*`) keep the
// user on the page they returned to — in-progress drafts are restored from
// localStorage by the per-brand `beforeEnter` guard (see
// `restoreSupervisorAlternativeDraftFromStorage` /
// `restoreSupervisorCommentsFromStorage` /
// `restoreAuthorRevisionDraftFromStorage`).
//
// Wizard URLs (`/constructor/step/N`) entered from the review screen for
// non-naming sections carry `?editBrand=<id>` — on cold start we redirect to
// the brand review page. Draft continuation uses `?brand=<id>` and is handled
// by the wizard `beforeEnter` guard (loads the draft from the API).
router.beforeEach((to, from) => {
  return resolveColdStartNavigation({
    fromName: from.name,
    toQueryEditBrand: to.query.editBrand,
    toIsDraftEdit: to.matched.some(r => r.meta.draftEdit === true),
    toParamsId: typeof to.params.id === 'string' ? to.params.id : undefined,
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

  // Embedded in the Admin: nothing may render without a session, not even the
  // public landing page — the Admin shell around us is already telling the user
  // they are signed in. Hand off to the parent so it can break out to the
  // top-level login, and park on `login` (which renders a neutral interstitial
  // in embed mode) until it does.
  if (isEmbedded() && !authStore.isAuthenticated) {
    postAuthRequired()
    return to.name === 'login' ? true : { name: 'login', query: { redirect: to.fullPath } }
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
