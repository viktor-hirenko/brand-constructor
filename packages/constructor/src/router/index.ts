import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConstructorStore } from '@/stores/constructor'
import { apiGet } from '@/composables/useApi'
import type { Brand } from '@brand-constructor/shared/types'

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
    meta: { requiresAuth: true, step: 10, title: 'Save', subtitle: 'Фінальний огляд' },
    children: [
      {
        path: '',
        name: 'brand-view-review',
        component: () => import('@/views/steps/Step10ReviewSubmit.vue'),
        meta: { step: 10, title: 'Save', subtitle: 'Фінальний огляд' },
      },
    ],
    beforeEnter: async (to) => {
      const brandId = to.params.id as string
      const store = useConstructorStore()

      try {
        const brand = await apiGet<Brand>(`/api/brands/${brandId}`)
        const stepData = brand.stepData ?? {
          brandBasics: { geo: brand.geo ? brand.geo.split(',') : [], launchDate: brand.launchDate ?? '', linkedProduct: '', comment: '' },
          mode: brand.mode ?? null,
          concept: { selectedId: brand.conceptId ?? null, comment: brand.conceptComment ?? '', newConceptBrief: brand.newConceptBrief ?? null },
          externalNaming: { selectedIds: brand.externalNamingIds ?? [], comment: brand.externalNamingComment ?? '', newNamingBrief: brand.newNamingBrief ?? null },
          internalNaming: { selectedId: brand.internalNamingId ?? null, comment: brand.internalNamingComment ?? '', newNamingFeedback: null },
          previewComment: '',
          marketingPackage: { selectedId: brand.prPackageId ?? null, comment: brand.prPackageComment ?? '' },
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
        }
        store.loadBrand(brandId, stepData, brand.currentStep ?? 10, brand.status, brand.internalName ?? undefined, brand.ceoComments ?? undefined, brand.ceoSelections ?? undefined)
        return true
      } catch {
        return { path: '/constructor/step/1' }
      }
    },
  },
  {
    path: '/constructor',
    component: () => import('@/views/ConstructorLayout.vue'),
    meta: { requiresAuth: true },
    beforeEnter: (to) => {
      const stepMatch = to.path.match(/\/constructor\/step\/(\d+)/);
      if (!stepMatch) return true;

      const targetStep = parseInt(stepMatch[1]);
      if (targetStep <= 1) return true;

      const store = useConstructorStore();
      if (targetStep > store.currentStep) {
        return { path: `/constructor/step/${store.currentStep}` };
      }
      return true;
    },
    children: [
      {
        path: '',
        redirect: '/constructor/step/1',
      },
      {
        path: 'step/1',
        name: 'step-1',
        component: () => import('@/views/steps/Step1BrandBasics.vue'),
        meta: { step: 1, title: 'Brand Basics', subtitle: 'GEO та опис' },
      },
      {
        path: 'step/2',
        name: 'step-2',
        component: () => import('@/views/steps/Step2Mode.vue'),
        meta: { step: 2, title: 'Mode', subtitle: 'Світла або темна тема' },
      },
      {
        path: 'step/3',
        name: 'step-3',
        component: () => import('@/views/steps/Step3ConceptSelection.vue'),
        meta: { step: 3, title: 'Concept Selection', subtitle: 'Вибір концепту дизайну' },
      },
      {
        path: 'step/4',
        name: 'step-4',
        component: () => import('@/views/steps/Step4ExternalNaming.vue'),
        meta: { step: 4, title: 'External Naming', subtitle: 'Зовнішні назви' },
      },
      {
        path: 'step/5',
        name: 'step-5',
        component: () => import('@/views/steps/Step5InternalNaming.vue'),
        meta: { step: 5, title: 'Internal Naming', subtitle: 'Внутрішня назва' },
      },
      {
        path: 'step/6',
        name: 'step-6',
        component: () => import('@/views/steps/Step6BrandPreview.vue'),
        meta: { step: 6, title: 'Brand Preview', subtitle: 'Перегляд бренду' },
      },
      {
        path: 'step/7',
        name: 'step-7',
        component: () => import('@/views/steps/Step7MarketingPackage.vue'),
        meta: { step: 7, title: 'Marketing Package', subtitle: 'PR пакет для запуску' },
      },
      {
        path: 'step/8',
        name: 'step-8',
        component: () => import('@/views/steps/Step8Deliverables.vue'),
        meta: { step: 8, title: 'Deliverables', subtitle: 'Додаткові опції' },
      },
      {
        path: 'step/9',
        name: 'step-9',
        component: () => import('@/views/steps/Step9VisualComponents.vue'),
        meta: { step: 9, title: 'Visual Components ⭐', subtitle: 'Візуальні компоненти' },
      },
      {
        path: 'step/10',
        name: 'step-10',
        component: () => import('@/views/steps/Step10ReviewSubmit.vue'),
        meta: { step: 10, title: 'Save', subtitle: 'Фінальний огляд' },
      },
    ],
  },
  {
    path: '/constructor/success',
    name: 'brand-success',
    component: () => import('@/views/BrandSuccessView.vue'),
    meta: { requiresAuth: true },
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

router.beforeEach(to => {
  if (import.meta.env.VITE_ENVIRONMENT === 'development') return true

  const authStore = useAuthStore()

  if (to.name === 'login') {
    if (authStore.isAuthenticated) return { path: '/constructor' }
    return true
  }

  if (to.name === 'landing') return true

  if (to.matched.some(r => r.meta.requiresAuth) && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
})

export default router
