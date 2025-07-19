import { createApp } from 'vue';
import MainApp from './MainApp.vue';
import i18n from './i18n';

const app = createApp(MainApp);
app.use(i18n);
app.mount('#app');
