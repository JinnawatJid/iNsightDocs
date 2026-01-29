import { createRouter, createWebHistory } from 'vue-router';
import PendingRequests from '../views/PendingRequests.vue';
import CustomerSearch from '../views/CustomerSearch.vue';
import CreateCreditRequest from '../views/CreateCreditRequest.vue';
import OcrComparison from '../views/OcrComparison.vue';
import CreditAnalysisReport from '../views/CreditAnalysisReport.vue';
import AdminDashboard from '../views/AdminDashboard.vue';

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
  {
    path: '/report/financial-analysis',
    name: 'CreditAnalysisReport',
    component: CreditAnalysisReport,
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
