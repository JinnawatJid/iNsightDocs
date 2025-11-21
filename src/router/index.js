import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import CreditApplication from '../views/CreditApplication.vue';
import CustomerSearch from '../views/CustomerSearch.vue';

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'HomePage',
    component: HomePage,
  },
  {
    path: '/credit-application/:custId',
    name: 'CreditApplication',
    component: CreditApplication,
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
