import { createRouter, createWebHistory } from 'vue-router';
import PendingRequestOld from '../views/PendingRequestOld.vue';
import CustomerSearch from '../views/CustomerSearch.vue';
import CreateCreditRequest from '../views/CreateCreditRequest.vue';
import OCRTest from '../views/OCRTest.vue';

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
    path: '/pending-request-old',
    name: 'PendingRequestOld',
    component: PendingRequestOld,
  },
  {
    path: '/customer-search',
    name: 'CustomerSearch',
    component: CustomerSearch,
  },
  {
    path: '/ocr-test',
    name: 'OCRTest',
    component: OCRTest,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
