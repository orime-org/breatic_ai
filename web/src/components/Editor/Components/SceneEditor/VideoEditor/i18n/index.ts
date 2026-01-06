import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from '../locales/zh.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zhTW from '../locales/zh-TW.json';

const resources = {
  zh: {
    translation: zh,
  },
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
  'zh-TW': {
    translation: zhTW,
  },
};

i18n
  .use(LanguageDetector) // 检测用户语言
  .use(initReactI18next) // 传递 i18n 实例给 react-i18next
  .init({
    resources,
    fallbackLng: 'en', // 默认语言
    lng: 'en', // 初始语言
    debug: false,
    interpolation: {
      escapeValue: false, // React 已经安全转义
    },
  });

export default i18n;

