import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import zh from './locales/zh.json';

const i18n = createI18n({
  legacy: false, // use composition API
  locale: navigator.language.startsWith('zh') ? 'zh' : 'en', // default language
  fallbackLocale: 'en', // fallback language
  messages: {
    en,
    zh
  }
});

export default i18n;
