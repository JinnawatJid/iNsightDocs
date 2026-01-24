import { createRouter, createWebHistory } from 'vue-router';
import PendingRequests from '../views/PendingRequests.vue';
import CustomerSearch from '../views/CustomerSearch.vue';
import CreateCreditRequest from '../views/CreateCreditRequest.vue';
import OcrComparison from '../views/OcrComparison.vue';

const routes = [
  {
    path: '/',
    redirect: '/create-credit-request',
  },
  {
    path: '/create-credit-request',
    name: 'CreateCreditRequest',
    component: CreateCreditRequest,
  },
  {
    path: '/pending-requests',
    name: 'PendingRequests',
    component: PendingRequests,
  },
  {
    path: '/customer-search',
    name: 'CustomerSearch',
    component: CustomerSearch,
  },
  {
    path: '/ocr-comparison',
    name: 'OcrComparison',
    component: OcrComparison,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
