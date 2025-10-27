import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import ChangePassword from '../views/ChangePassword.vue';
import MainPage from '../views/MainPage.vue';
import ForgotPassword from '../views/ForgotPassword.vue';

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
    path: '/main',
    name: 'MainPage',
    component: MainPage,
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
