import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
    },
  ],
});

export { router };
