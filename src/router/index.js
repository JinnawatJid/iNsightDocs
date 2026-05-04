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
    meta: { permission: 'page:create-credit' }
  },
  {
    path: '/pending-requests',
    name: 'PendingRequests',
    component: PendingRequests,
    meta: { permission: 'page:pending-requests' }
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
    meta: { permission: 'page:batch-automation' }
  },
  {
    path: '/configuration',
    name: 'SystemConfiguration',
    component: SystemConfiguration,
    meta: { permission: 'page:system-configuration' }
  },
];

import { useAuthStore } from '../stores/auth';
import { useRbacStore } from '../stores/rbac';
import Swal from 'sweetalert2';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global authentication guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.authRequired && !authStore.isAuthenticated) {
    // Attempt to re-initialize just in case (this handles dev mock user)
    await authStore.initAuth();
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

    // Check dynamic RBAC permissions
  // Check dynamic RBAC permissions
  const rbacStore = useRbacStore();

  // Admin lock-out prevention edge case check (must happen BEFORE the main denial block)
  if (to.path === '/configuration' && !rbacStore.hasPermission('page:system-configuration') && authStore.isAdmin) {
    console.error('CRITICAL: Admin has locked themselves out of /configuration in RBAC! Allowing fallback override.');
    return next();
  }

  if (to.meta.permission && !rbacStore.hasPermission(to.meta.permission)) {
    console.warn(`Access denied: User lacks ${to.meta.permission} to access ${to.path}`);
    Swal.fire({
      icon: 'error',
      title: 'ไม่ได้รับอนุญาต (Access Denied)',
      text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ'
    });
    // Fallback logic if denied: if they are trying to go somewhere and they don't have access,
    // send them to pending-requests if they have that, or just stop them.
    if (to.path !== '/' && to.path !== '/create-credit-request') {
       if (rbacStore.hasPermission('page:pending-requests')) {
           return next('/pending-requests');
       } else if (rbacStore.hasPermission('page:create-credit')) {
           return next('/create-credit-request');
       } else {
           // No permissions at all?
           return next(false);
       }
    } else {
       if (rbacStore.hasPermission('page:pending-requests')) {
           return next('/pending-requests');
       }
       return next(false);
    }
  }

  // User is authenticated and authorized, proceed to route
  next();
});

export default router;
