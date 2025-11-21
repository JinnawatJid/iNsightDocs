import { createRouter, createWebHistory } from 'vue-router';
import PendingRequestOld from '../views/PendingRequestOld.vue';
import CustomerSearch from '../views/CustomerSearch.vue';

const routes = [
  {
    path: '/',
    redirect: '/pending-request-old',
  },
  {
    path: '/pending-request-old',
    name: 'PendingRequestOld',
    component: PendingRequestOld,
  },
  {
    path: '/customer-search',
    name: 'CustomerSearch',
    component: CustomerSearch,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
