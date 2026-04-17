import { createRouter, createWebHistory } from 'vue-router';
import PendingRequests from '../views/PendingRequests.vue';
import CustomerSearch from '../views/CustomerSearch.vue';
import CreateCreditRequest from '../views/CreateCreditRequest.vue';
import OcrComparison from '../views/OcrComparison.vue';
import CreditAnalysisReport from '../views/CreditAnalysisReport.vue';
import BatchAutomation from '../views/BatchAutomation.vue';
import SystemConfiguration from '../views/SystemConfiguration.vue';

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
    path: '/batch-automation',
    name: 'BatchAutomation',
    component: BatchAutomation,
  },
  {
    path: '/configuration',
    name: 'SystemConfiguration',
    component: SystemConfiguration,
  },
];

import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global authentication guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.authRequired) {
    return next(); // Bypass authentication completely
  }

  if (!authStore.isAuthenticated) {
    // Attempt to re-initialize just in case the cookie was added between page loads
    await authStore.initAuth();

    if (!authStore.isAuthenticated) {
      // Redirect to Identity Provider
      window.location.href = authStore.loginUrl;
      return next(false); // Abort current navigation
    }
  }

  if (to.path === '/configuration' && !authStore.isAdmin) {
    return next('/'); // Protect admin paths
  }

  // User is authenticated, proceed to route
  next();
});

export default router;
