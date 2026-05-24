import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'viewerjs/dist/viewer.css';
import VueViewer from 'v-viewer';
import './style.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(VueViewer);

async function initializeApp() {
  const authStore = useAuthStore(pinia);

  // 1. Fetch backend configuration to see if auth is required (e.g., checking .env)
  await authStore.fetchAuthConfig();

  // 2. Initialize token parsing
  await authStore.initAuth();

  // 3. Mount router and app
  app.use(router);
  app.mount('#app');
}

initializeApp();
