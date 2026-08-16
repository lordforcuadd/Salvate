import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/main.css';
import { initDB } from './services/db';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// Pre-initialize IndexedDB before mounting
initDB()
  .then(() => {
    app.mount('#app');
  })
  .catch((err) => {
    console.error('Failed to initialize IndexedDB:', err);
    app.mount('#app');
  });
