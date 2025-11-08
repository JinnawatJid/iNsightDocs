import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import ChangePassword from '../views/ChangePassword.vue';
import HomePage from '../views/HomePage.vue';
import ForgotPassword from '../views/ForgotPassword.vue';
import CreditHistory from '../views/CreditHistory.vue';
import CreditApplication from '../views/CreditApplication.vue';
import NewCreditApplication from '../views/NewCreditApplication.vue';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: ChangePassword,
  },
  {
    path: '/home',
    name: 'HomePage',
    component: HomePage,
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
  },
  {
    path: '/credit-history',
    name: 'CreditHistory',
    component: CreditHistory,
  },
  {
    path: '/credit-application/:custId',
    name: 'CreditApplication',
    component: CreditApplication,
  },
  {
    path: '/new-credit-application',
    name: 'NewCreditApplication',
    component: NewCreditApplication,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
